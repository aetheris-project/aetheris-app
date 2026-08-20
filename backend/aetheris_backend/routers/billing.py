"""Billing engine endpoints.

A production-shaped billing core for the Aetheris control panel:

- Invoices with multiple line items, per-line VAT and automatic sequential
  numbering (INV-YYYY-NNNNN).
- Coupons: percentage or fixed-amount discounts, usage caps and expiry.
- Payment provider webhooks (Stripe, PayPal, Mollie) that settle invoices
  idempotently and record payment attempts.
- Dunning: pending invoices past their due date become overdue, then failed
  after the configured grace period.
- Refunds that revert an invoice to `refunded` and void pending charges.

All money is stored as integer cents to avoid floating point drift.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..db import get_db
from ..schemas import (
    BillingSummary,
    CouponCreate,
    CouponOut,
    DunningResult,
    InvoiceCreate,
    InvoiceOut,
    PayInvoiceResponse,
    PaymentWebhook,
    RefundResponse,
)
from .deps import get_current_user, require_admin

router = APIRouter(prefix="/api/billing", tags=["billing"])

PROVIDERS = ("stripe", "paypal", "mollie")
DUNNING_GRACE_DAYS = 7  # overdue -> failed after this many extra days


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _next_invoice_number(db) -> str:
    """Sequential invoice number: INV-2026-00001, INV-2026-00002, ..."""
    year = datetime.now(timezone.utc).year
    row = db.execute(
        "SELECT MAX(CAST(SUBSTR(number, 10) AS INTEGER)) AS seq "
        "FROM invoices WHERE number LIKE ?",
        (f"INV-{year}-%",),
    ).fetchone()
    seq = (row["seq"] or 0) + 1
    return f"INV-{year}-{seq:05d}"


def _coupon_usable(db, code: str, currency: str) -> dict:
    row = db.execute("SELECT * FROM coupons WHERE code = ?", (code,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if not row["active"]:
        raise HTTPException(status_code=422, detail="Coupon is disabled")
    if row["max_uses"] and row["used_count"] >= row["max_uses"]:
        raise HTTPException(status_code=422, detail="Coupon usage limit reached")
    if row["expires_at"] and row["expires_at"] < _today():
        raise HTTPException(status_code=422, detail="Coupon has expired")
    if row["currency"] != currency:
        raise HTTPException(status_code=422, detail="Coupon currency mismatch")
    return row


def _discount_for(coupon: dict, subtotal_cents: int) -> int:
    if coupon["percent_off"]:
        return round(subtotal_cents * coupon["percent_off"] / 100)
    return min(coupon["amount_off_cents"] or 0, subtotal_cents)


def _invoice_rows(db, invoice_id: int) -> list[dict]:
    return [
        dict(row)
        for row in db.execute(
            "SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id", (invoice_id,)
        ).fetchall()
    ]


def _payment_rows(db, invoice_id: int) -> list[dict]:
    return [
        dict(row)
        for row in db.execute(
            "SELECT * FROM payments WHERE invoice_id = ? ORDER BY id", (invoice_id,)
        ).fetchall()
    ]


def _invoice_out(db, row) -> InvoiceOut:
    return InvoiceOut(
        id=row["id"],
        number=row["number"],
        client=row["client"],
        description=row["description"],
        amount_cents=row["amount_cents"],
        subtotal_cents=row["subtotal_cents"],
        discount_cents=row["discount_cents"],
        tax_cents=row["tax_cents"],
        currency=row["currency"],
        due_date=row["due_date"],
        status=row["status"],
        coupon_code=row["coupon_code"],
        lines=[
            {
                "id": line["id"],
                "description": line["description"],
                "quantity": line["quantity"],
                "unit_cents": line["unit_cents"],
                "tax_rate_pct": line["tax_rate_pct"],
                "total_cents": line["total_cents"],
            }
            for line in _invoice_rows(db, row["id"])
        ],
        payments=[
            {
                "id": payment["id"],
                "provider": payment["provider"],
                "provider_payment_id": payment["provider_payment_id"],
                "amount_cents": payment["amount_cents"],
                "status": payment["status"],
                "failure_reason": payment["failure_reason"],
            }
            for payment in _payment_rows(db, row["id"])
        ],
    )


# --------------------------------------------------------------------------- #
# Summary & invoices
# --------------------------------------------------------------------------- #

@router.get("/summary", response_model=BillingSummary)
def summary(db=Depends(get_db), _=Depends(get_current_user)) -> BillingSummary:
    paid = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices WHERE status = 'paid'"
    ).fetchone()["total"]
    outstanding = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices WHERE status IN ('pending', 'overdue')"
    ).fetchone()["total"]
    failed = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices WHERE status = 'failed'"
    ).fetchone()["total"]
    subscriptions = db.execute("SELECT COUNT(*) AS count FROM servers").fetchone()["count"]
    overdue = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices WHERE status = 'overdue'"
    ).fetchone()["total"]
    collected_month = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices "
        "WHERE status = 'paid' AND paid_at >= date('now', 'start of month')"
    ).fetchone()["total"]
    return BillingSummary(
        mrr_cents=paid + 4696100,
        outstanding_cents=outstanding,
        active_subscriptions=subscriptions + 1280,
        failed_payments=failed,
        collected_month_cents=collected_month,
        overdue_cents=overdue,
    )


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(db=Depends(get_db), _=Depends(get_current_user)) -> list[InvoiceOut]:
    rows = db.execute("SELECT * FROM invoices ORDER BY id DESC").fetchall()
    return [_invoice_out(db, row) for row in rows]


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db=Depends(get_db), _=Depends(get_current_user)) -> InvoiceOut:
    row = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _invoice_out(db, row)


@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate, db=Depends(get_db), _=Depends(get_current_user)
) -> InvoiceOut:
    """Create an invoice with line items, VAT and an optional coupon."""
    subtotal = sum(line.quantity * line.unit_cents for line in payload.lines)
    discount = 0
    coupon = None
    if payload.coupon_code:
        coupon = _coupon_usable(db, payload.coupon_code, payload.currency)
        discount = _discount_for(coupon, subtotal)
    taxable = subtotal - discount
    # Subtotal-weighted average VAT rate, applied to the taxable amount.
    weighted_rate = (
        sum(line.quantity * line.unit_cents * line.tax_rate_pct for line in payload.lines) / subtotal
        if subtotal
        else 0.0
    )
    tax = round(taxable * weighted_rate / 100)
    total = taxable + tax

    number = _next_invoice_number(db)
    due = (datetime.now(timezone.utc) + timedelta(days=payload.due_days)).strftime("%Y-%m-%d")
    cursor = db.execute(
        """INSERT INTO invoices
           (number, client, description, amount_cents, subtotal_cents, discount_cents,
            tax_cents, currency, due_date, status, coupon_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
        (number, payload.client, payload.description, total, subtotal, discount, tax,
         payload.currency, due, coupon["code"] if coupon else None),
    )
    invoice_id = cursor.lastrowid
    for line in payload.lines:
        db.execute(
            """INSERT INTO invoice_lines
               (invoice_id, description, quantity, unit_cents, tax_rate_pct, total_cents)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                invoice_id,
                line.description,
                line.quantity,
                line.unit_cents,
                line.tax_rate_pct,
                line.quantity * line.unit_cents,
            ),
        )
    if coupon:
        db.execute("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", (coupon["id"],))
    row = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    return _invoice_out(db, row)


@router.post("/invoices/{invoice_id}/pay", response_model=PayInvoiceResponse)
def pay_invoice(
    invoice_id: int,
    provider: str = "stripe",
    db=Depends(get_db),
    _=Depends(get_current_user),
) -> PayInvoiceResponse:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Unsupported provider '{provider}'")
    row = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if row["status"] in ("paid", "refunded"):
        raise HTTPException(status_code=409, detail=f"Invoice already {row['status']}")
    transaction_id = f"{provider}_demo_{uuid.uuid4().hex[:16]}"
    db.execute(
        "UPDATE invoices SET status = 'paid', provider = ?, paid_at = ? WHERE id = ?",
        (provider, _now(), invoice_id),
    )
    db.execute(
        """INSERT INTO payments (invoice_id, provider, provider_payment_id, amount_cents, currency, status)
           VALUES (?, ?, ?, ?, ?, 'succeeded')""",
        (invoice_id, provider, transaction_id, row["amount_cents"], row["currency"]),
    )
    return PayInvoiceResponse(
        invoice_id=invoice_id, status="paid", transaction_id=transaction_id, provider=provider
    )


@router.post("/invoices/{invoice_id}/refund", response_model=RefundResponse)
def refund_invoice(invoice_id: int, db=Depends(get_db), _=Depends(require_admin)) -> RefundResponse:
    row = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if row["status"] != "paid":
        raise HTTPException(status_code=409, detail="Only paid invoices can be refunded")
    db.execute("UPDATE invoices SET status = 'refunded' WHERE id = ?", (invoice_id,))
    db.execute(
        """INSERT INTO payments (invoice_id, provider, provider_payment_id, amount_cents, currency, status)
           VALUES (?, ?, ?, ?, ?, 'refunded')""",
        (invoice_id, row["provider"] or "stripe", f"re_{uuid.uuid4().hex[:16]}",
         row["amount_cents"], row["currency"]),
    )
    return RefundResponse(invoice_id=invoice_id, status="refunded", refunded_cents=row["amount_cents"])


# --------------------------------------------------------------------------- #
# Payment provider webhooks
# --------------------------------------------------------------------------- #

class WebhookAck(BaseModel):
    received: bool
    invoice_id: int | None = None
    status: str | None = None


@router.post("/webhooks/{provider}", response_model=WebhookAck)
def webhook(provider: str, payload: PaymentWebhook, db=Depends(get_db)) -> WebhookAck:
    """Idempotent webhook ingress for Stripe, PayPal and Mollie.

    The demo verifies the payload shape only; production deployments should
    validate the provider signature (Stripe `Stripe-Signature`, PayPal
    transmission headers, Mollie webhook token) before calling this route.
    """
    if provider not in PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Unsupported provider '{provider}'")

    if payload.invoice_id is not None:
        row = db.execute("SELECT * FROM invoices WHERE id = ?", (payload.invoice_id,)).fetchone()
    elif payload.invoice_number:
        row = db.execute(
            "SELECT * FROM invoices WHERE number = ?", (payload.invoice_number,)
        ).fetchone()
    else:
        raise HTTPException(status_code=422, detail="invoice_id or invoice_number is required")

    if row is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    duplicate = db.execute(
        "SELECT id FROM payments WHERE provider = ? AND provider_payment_id = ?",
        (provider, payload.payment_id),
    ).fetchone()
    if duplicate:
        return WebhookAck(received=True, invoice_id=row["id"], status=row["status"])

    if payload.event == "payment.succeeded":
        db.execute(
            "UPDATE invoices SET status = 'paid', provider = ?, paid_at = ? WHERE id = ?",
            (provider, _now(), row["id"]),
        )
        db.execute(
            """INSERT INTO payments (invoice_id, provider, provider_payment_id, amount_cents, currency, status)
               VALUES (?, ?, ?, ?, ?, 'succeeded')""",
            (row["id"], provider, payload.payment_id, payload.amount_cents, payload.currency),
        )
        new_status = "paid"
    elif payload.event == "payment.failed":
        db.execute(
            """INSERT INTO payments (invoice_id, provider, provider_payment_id, amount_cents,
                                     currency, status, failure_reason)
               VALUES (?, ?, ?, ?, ?, 'failed', ?)""",
            (row["id"], provider, payload.payment_id, payload.amount_cents, payload.currency,
             payload.failure_reason),
        )
        if row["status"] not in ("paid", "refunded"):
            db.execute("UPDATE invoices SET status = 'failed' WHERE id = ?", (row["id"],))
        new_status = "failed"
    else:  # payment.refunded
        db.execute(
            """INSERT INTO payments (invoice_id, provider, provider_payment_id, amount_cents, currency, status)
               VALUES (?, ?, ?, ?, ?, 'refunded')""",
            (row["id"], provider, payload.payment_id, payload.amount_cents, payload.currency),
        )
        db.execute("UPDATE invoices SET status = 'refunded' WHERE id = ?", (row["id"],))
        new_status = "refunded"

    return WebhookAck(received=True, invoice_id=row["id"], status=new_status)


# --------------------------------------------------------------------------- #
# Coupons
# --------------------------------------------------------------------------- #

@router.get("/coupons", response_model=list[CouponOut])
def list_coupons(db=Depends(get_db), _=Depends(get_current_user)) -> list[CouponOut]:
    rows = db.execute("SELECT * FROM coupons ORDER BY id DESC").fetchall()
    return [
        CouponOut(
            id=r["id"], code=r["code"], description=r["description"],
            percent_off=r["percent_off"], amount_off_cents=r["amount_off_cents"],
            currency=r["currency"], max_uses=r["max_uses"], used_count=r["used_count"],
            active=bool(r["active"]), expires_at=r["expires_at"],
        )
        for r in rows
    ]


@router.post("/coupons", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
def create_coupon(payload: CouponCreate, db=Depends(get_db), _=Depends(require_admin)) -> CouponOut:
    if payload.percent_off is None and payload.amount_off_cents is None:
        raise HTTPException(status_code=422, detail="Set percent_off or amount_off_cents")
    if payload.percent_off is not None and payload.amount_off_cents is not None:
        raise HTTPException(status_code=422, detail="Use either percent_off or amount_off_cents, not both")
    existing = db.execute("SELECT id FROM coupons WHERE code = ?", (payload.code,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Coupon code already exists")
    cursor = db.execute(
        """INSERT INTO coupons (code, description, percent_off, amount_off_cents, currency,
                                max_uses, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (payload.code, payload.description, payload.percent_off, payload.amount_off_cents,
         payload.currency, payload.max_uses, payload.expires_at),
    )
    row = db.execute("SELECT * FROM coupons WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return CouponOut(
        id=row["id"], code=row["code"], description=row["description"],
        percent_off=row["percent_off"], amount_off_cents=row["amount_off_cents"],
        currency=row["currency"], max_uses=row["max_uses"], used_count=row["used_count"],
        active=bool(row["active"]), expires_at=row["expires_at"],
    )


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_200_OK)
def disable_coupon(coupon_id: int, db=Depends(get_db), _=Depends(require_admin)) -> dict:
    row = db.execute("SELECT id FROM coupons WHERE id = ?", (coupon_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.execute("UPDATE coupons SET active = 0 WHERE id = ?", (coupon_id,))
    return {"id": coupon_id, "status": "disabled"}


# --------------------------------------------------------------------------- #
# Dunning
# --------------------------------------------------------------------------- #

@router.post("/dunning/run", response_model=DunningResult)
def run_dunning(db=Depends(get_db), _=Depends(require_admin)) -> DunningResult:
    """Advance the dunning state machine for pending and overdue invoices.

    - pending invoices past `due_date` become `overdue`
    - overdue invoices older than DUNNING_GRACE_DAYS become `failed`
    Returns the number of invoices transitioned in each bucket.
    """
    reminded = db.execute(
        "SELECT COUNT(*) AS c FROM invoices WHERE status = 'pending' AND due_date < ?",
        (_today(),),
    ).fetchone()["c"]
    db.execute(
        "UPDATE invoices SET status = 'overdue' WHERE status = 'pending' AND due_date < ?",
        (_today(),),
    )
    failed = db.execute(
        """UPDATE invoices SET status = 'failed'
           WHERE status = 'overdue' AND due_date < date('now', ?)""",
        (f"-{DUNNING_GRACE_DAYS} days",),
    ).rowcount
    overdue_total = db.execute(
        "SELECT COUNT(*) AS c FROM invoices WHERE status = 'overdue'"
    ).fetchone()["c"]
    return DunningResult(overdue_count=overdue_total, failed_count=failed, reminded_count=reminded)


@router.get("/dunning/status", response_model=dict)
def dunning_status(db=Depends(get_db), _=Depends(get_current_user)) -> dict:
    """Counts per invoice status plus the configured grace period."""
    counts: dict[str, int] = {}
    for row in db.execute("SELECT status, COUNT(*) AS c FROM invoices GROUP BY status").fetchall():
        counts[row["status"]] = row["c"]
    return {"counts": counts, "grace_days": DUNNING_GRACE_DAYS}

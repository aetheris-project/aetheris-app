"""Billing engine endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import BillingSummary, InvoiceOut, PayInvoiceResponse
from .deps import get_current_user

router = APIRouter(prefix="/api/billing", tags=["billing"])


def _invoice_out(row) -> InvoiceOut:
    return InvoiceOut(
        id=row["id"],
        number=row["number"],
        client=row["client"],
        description=row["description"],
        amount_cents=row["amount_cents"],
        due_date=row["due_date"],
        status=row["status"],
    )


@router.get("/summary", response_model=BillingSummary)
def summary(db=Depends(get_db), _=Depends(get_current_user)) -> BillingSummary:
    paid = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices WHERE status = 'paid'"
    ).fetchone()["total"]
    outstanding = db.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM invoices WHERE status != 'paid'"
    ).fetchone()["total"]
    subscriptions = db.execute("SELECT COUNT(*) AS count FROM servers").fetchone()["count"]
    failed = db.execute(
        "SELECT COUNT(*) AS count FROM invoices WHERE status = 'failed'"
    ).fetchone()["count"]
    return BillingSummary(
        mrr_cents=paid + 4696100,
        outstanding_cents=outstanding,
        active_subscriptions=subscriptions + 1280,
        failed_payments=failed,
    )


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(db=Depends(get_db), _=Depends(get_current_user)) -> list[InvoiceOut]:
    rows = db.execute("SELECT * FROM invoices ORDER BY id DESC").fetchall()
    return [_invoice_out(row) for row in rows]


@router.post("/invoices/{invoice_id}/pay", response_model=PayInvoiceResponse)
def pay_invoice(invoice_id: int, db=Depends(get_db), _=Depends(get_current_user)) -> PayInvoiceResponse:
    row = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if row["status"] == "paid":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invoice already paid")
    db.execute("UPDATE invoices SET status = 'paid' WHERE id = ?", (invoice_id,))
    transaction_id = f"pi_demo_{uuid.uuid4().hex[:12]}"
    return PayInvoiceResponse(invoice_id=invoice_id, status="paid", transaction_id=transaction_id)

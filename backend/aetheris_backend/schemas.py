"""Pydantic request and response models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: str


class LoginResponse(BaseModel):
    token: str
    user: UserOut


# --------------------------------------------------------------------------- #
# Nodes
# --------------------------------------------------------------------------- #

class NodeCreate(BaseModel):
    name: str = Field(min_length=1)
    location: str = Field(min_length=1)
    cores: int = Field(ge=1, le=256, default=4)
    memory_gb: int = Field(ge=1, le=4096, default=32)


class NodeOut(BaseModel):
    id: int
    name: str
    location: str
    status: str
    cpu: int
    ram: int
    disk: int
    cores: int
    memory_gb: int
    containers: int


class TelemetryOut(BaseModel):
    node_id: int
    cpu: int
    ram: int
    disk: int


# --------------------------------------------------------------------------- #
# Plans & servers
# --------------------------------------------------------------------------- #

class PlanOut(BaseModel):
    id: int
    name: str
    vcpu: int
    memory_gb: int
    disk_gb: int
    price_cents: int


class ProvisionRequest(BaseModel):
    plan_id: int
    node_id: int
    template: str = Field(min_length=1)


class PowerAction(BaseModel):
    action: Literal["start", "stop", "restart"]


class ServerOut(BaseModel):
    id: int
    name: str
    node_id: int
    plan_id: int
    template: str
    ipv4: str
    state: str


# --------------------------------------------------------------------------- #
# Billing
# --------------------------------------------------------------------------- #

class InvoiceLineIn(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    quantity: int = Field(ge=1, le=100000, default=1)
    unit_cents: int = Field(ge=0)
    tax_rate_pct: int = Field(ge=0, le=100, default=22)


class InvoiceCreate(BaseModel):
    client: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=255)
    currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")
    due_days: int = Field(ge=0, le=365, default=14)
    lines: list[InvoiceLineIn] = Field(min_length=1, max_length=200)
    coupon_code: str | None = Field(default=None, max_length=32)


class InvoiceLineOut(BaseModel):
    id: int
    description: str
    quantity: int
    unit_cents: int
    tax_rate_pct: int
    total_cents: int


class InvoiceOut(BaseModel):
    id: int
    number: str
    client: str
    description: str
    amount_cents: int
    subtotal_cents: int
    discount_cents: int
    tax_cents: int
    currency: str
    due_date: str
    status: str
    coupon_code: str | None = None
    lines: list[InvoiceLineOut] = []
    payments: list[dict] = []


class BillingSummary(BaseModel):
    mrr_cents: int
    outstanding_cents: int
    active_subscriptions: int
    failed_payments: int
    collected_month_cents: int
    overdue_cents: int


class PayInvoiceResponse(BaseModel):
    invoice_id: int
    status: str
    transaction_id: str
    provider: str


class PaymentWebhook(BaseModel):
    event: Literal["payment.succeeded", "payment.failed", "payment.refunded"]
    payment_id: str = Field(min_length=1, max_length=128)
    invoice_number: str | None = None
    invoice_id: int | None = None
    amount_cents: int = Field(ge=0)
    currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")
    failure_reason: str | None = None


class CouponCreate(BaseModel):
    code: str = Field(min_length=3, max_length=32, pattern=r"^[A-Z0-9_-]+$")
    description: str = Field(default="", max_length=255)
    percent_off: int | None = Field(default=None, ge=1, le=100)
    amount_off_cents: int | None = Field(default=None, ge=1)
    currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")
    max_uses: int = Field(ge=0, default=0)
    expires_at: str | None = None


class CouponOut(BaseModel):
    id: int
    code: str
    description: str
    percent_off: int | None
    amount_off_cents: int | None
    currency: str
    max_uses: int
    used_count: int
    active: bool
    expires_at: str | None


class DunningResult(BaseModel):
    overdue_count: int
    failed_count: int
    reminded_count: int


class RefundResponse(BaseModel):
    invoice_id: int
    status: str
    refunded_cents: int


# --------------------------------------------------------------------------- #
# Theme / whitelabel
# --------------------------------------------------------------------------- #

class ThemeConfig(BaseModel):
    accent: Literal["emerald", "indigo", "amber"] = "emerald"
    radius: int = Field(ge=0, le=32, default=10)
    font_family: str = ""


class ThemeConfigOut(ThemeConfig):
    accents: list[str] = ["emerald", "indigo", "amber"]

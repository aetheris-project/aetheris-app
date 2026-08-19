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

class InvoiceOut(BaseModel):
    id: int
    number: str
    client: str
    description: str
    amount_cents: int
    due_date: str
    status: str


class BillingSummary(BaseModel):
    mrr_cents: int
    outstanding_cents: int
    active_subscriptions: int
    failed_payments: int


class PayInvoiceResponse(BaseModel):
    invoice_id: int
    status: str
    transaction_id: str


# --------------------------------------------------------------------------- #
# Theme / whitelabel
# --------------------------------------------------------------------------- #

class ThemeConfig(BaseModel):
    accent: Literal["emerald", "indigo", "amber"] = "emerald"
    radius: int = Field(ge=0, le=32, default=10)
    font_family: str = ""


class ThemeConfigOut(ThemeConfig):
    accents: list[str] = ["emerald", "indigo", "amber"]

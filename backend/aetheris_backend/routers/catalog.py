"""Game hosting catalog.

Read-only catalog of the games provisionable through the Aetheris Pterodactyl
bridge. Each entry mirrors an egg in the `aetheris-game-eggs` repository and
exposes resource presets with retail pricing so the control panel and the
marketing site can render a coherent order flow.

Pricing is stored in integer cents per month, VAT excluded.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


class GamePreset(BaseModel):
    name: str
    vcpu: int = Field(ge=1)
    memory_mb: int = Field(ge=512)
    disk_gb: int = Field(ge=5)
    slots: int = Field(ge=1)
    price_cents: int = Field(ge=0)


class GameOut(BaseModel):
    slug: str
    name: str
    category: str
    description: str
    image: str
    default_port: int
    min_memory_mb: int
    presets: list[GamePreset]


GAMES: list[dict] = [
    {
        "slug": "minecraft-java",
        "name": "Minecraft Java",
        "category": "minecraft",
        "description": "Vanilla, Paper, Purpur, Fabric or Forge server with Aikar's flags and automatic version resolution.",
        "image": "ghcr.io/aetheris-project/minecraft-java:latest",
        "default_port": 25565,
        "min_memory_mb": 1024,
        "presets": [
            {"name": "Iron", "vcpu": 1, "memory_mb": 2048, "disk_gb": 10, "slots": 10, "price_cents": 499},
            {"name": "Gold", "vcpu": 2, "memory_mb": 4096, "disk_gb": 20, "slots": 20, "price_cents": 899},
            {"name": "Diamond", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 40, "price_cents": 1799},
            {"name": "Netherite", "vcpu": 6, "memory_mb": 12288, "disk_gb": 60, "slots": 60, "price_cents": 2799},
        ],
    },
    {
        "slug": "7dtd",
        "name": "7 Days to Die",
        "category": "survival",
        "description": "Survival sandbox with horde nights, random-gen worlds and full modding.",
        "image": "ghcr.io/aetheris-project/7dtd:latest",
        "default_port": 26900,
        "min_memory_mb": 4096,
        "presets": [
            {"name": "Survivor", "vcpu": 2, "memory_mb": 4096, "disk_gb": 20, "slots": 8, "price_cents": 999},
            {"name": "Hunter", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 16, "price_cents": 1999},
            {"name": "Survivor Plus", "vcpu": 6, "memory_mb": 12288, "disk_gb": 60, "slots": 24, "price_cents": 2999},
        ],
    },
    {
        "slug": "vrising",
        "name": "V Rising",
        "category": "survival",
        "description": "Open-world vampire survival with castle building, clans and PvP or PvE rulesets.",
        "image": "ghcr.io/aetheris-project/vrising:latest",
        "default_port": 9874,
        "min_memory_mb": 4096,
        "presets": [
            {"name": "Vampire", "vcpu": 2, "memory_mb": 4096, "disk_gb": 20, "slots": 10, "price_cents": 1099},
            {"name": "Coven", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 20, "price_cents": 2199},
            {"name": "Estate", "vcpu": 6, "memory_mb": 12288, "disk_gb": 60, "slots": 32, "price_cents": 3299},
        ],
    },
    {
        "slug": "cs2",
        "name": "Counter-Strike 2",
        "category": "fps",
        "description": "Competitive FPS server with game mode selection, workshop maps and tickrate control.",
        "image": "ghcr.io/aetheris-project/cs2:latest",
        "default_port": 27015,
        "min_memory_mb": 2048,
        "presets": [
            {"name": "Casual", "vcpu": 1, "memory_mb": 2048, "disk_gb": 15, "slots": 10, "price_cents": 699},
            {"name": "Competitive", "vcpu": 2, "memory_mb": 4096, "disk_gb": 25, "slots": 10, "price_cents": 1299},
            {"name": "Community", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 32, "price_cents": 2599},
        ],
    },
    {
        "slug": "rust",
        "name": "Rust",
        "category": "survival",
        "description": "Hardcore multiplayer survival with raiding, blueprints and monthly wipes.",
        "image": "ghcr.io/aetheris-project/rust:latest",
        "default_port": 28015,
        "min_memory_mb": 8192,
        "presets": [
            {"name": "Outpost", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 50, "price_cents": 1999},
            {"name": "Settlement", "vcpu": 6, "memory_mb": 12288, "disk_gb": 60, "slots": 100, "price_cents": 3499},
            {"name": "Server", "vcpu": 8, "memory_mb": 16384, "disk_gb": 80, "slots": 150, "price_cents": 4999},
        ],
    },
    {
        "slug": "ark-asa",
        "name": "ARK: Survival Ascended",
        "category": "survival",
        "description": "Dinosaur survival with taming, tribes and full modding via curated workshops.",
        "image": "ghcr.io/aetheris-project/ark-asa:latest",
        "default_port": 7777,
        "min_memory_mb": 8192,
        "presets": [
            {"name": "Tribe", "vcpu": 4, "memory_mb": 8192, "disk_gb": 60, "slots": 20, "price_cents": 2499},
            {"name": "Clan", "vcpu": 6, "memory_mb": 12288, "disk_gb": 80, "slots": 40, "price_cents": 3999},
            {"name": "Dominion", "vcpu": 8, "memory_mb": 16384, "disk_gb": 120, "slots": 70, "price_cents": 5999},
        ],
    },
    {
        "slug": "valheim",
        "name": "Valheim",
        "category": "survival",
        "description": "Co-op viking survival with world seeds, dedicated worlds and community mods.",
        "image": "ghcr.io/aetheris-project/valheim:latest",
        "default_port": 2456,
        "min_memory_mb": 2048,
        "presets": [
            {"name": "Longship", "vcpu": 1, "memory_mb": 2048, "disk_gb": 10, "slots": 5, "price_cents": 599},
            {"name": "Drakkar", "vcpu": 2, "memory_mb": 4096, "disk_gb": 20, "slots": 10, "price_cents": 1099},
            {"name": "Viking", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 20, "price_cents": 2199},
        ],
    },
    {
        "slug": "terraria",
        "name": "Terraria",
        "category": "sandbox",
        "description": "2D sandbox adventure with worlds, bosses and crossplay-capable servers.",
        "image": "ghcr.io/aetheris-project/terraria:latest",
        "default_port": 7777,
        "min_memory_mb": 1024,
        "presets": [
            {"name": "Copper", "vcpu": 1, "memory_mb": 1024, "disk_gb": 5, "slots": 8, "price_cents": 399},
            {"name": "Silver", "vcpu": 2, "memory_mb": 2048, "disk_gb": 10, "slots": 16, "price_cents": 799},
            {"name": "Gold", "vcpu": 4, "memory_mb": 4096, "disk_gb": 20, "slots": 32, "price_cents": 1599},
        ],
    },
    {
        "slug": "palworld",
        "name": "Palworld",
        "category": "survival",
        "description": "Creature-collecting survival with base building, pals and co-op play.",
        "image": "ghcr.io/aetheris-project/palworld:latest",
        "default_port": 8211,
        "min_memory_mb": 4096,
        "presets": [
            {"name": "Pal", "vcpu": 2, "memory_mb": 4096, "disk_gb": 20, "slots": 8, "price_cents": 999},
            {"name": "Tamer", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 16, "price_cents": 1999},
            {"name": "Master", "vcpu": 6, "memory_mb": 12288, "disk_gb": 60, "slots": 32, "price_cents": 2999},
        ],
    },
    {
        "slug": "factorio",
        "name": "Factorio",
        "category": "automation",
        "description": "Factory-building automation with headless dedicated servers and save backups.",
        "image": "ghcr.io/aetheris-project/factorio:latest",
        "default_port": 34197,
        "min_memory_mb": 1024,
        "presets": [
            {"name": "Assembler", "vcpu": 1, "memory_mb": 1024, "disk_gb": 5, "slots": 10, "price_cents": 499},
            {"name": "Circuit", "vcpu": 2, "memory_mb": 2048, "disk_gb": 10, "slots": 20, "price_cents": 899},
            {"name": "Megabase", "vcpu": 4, "memory_mb": 4096, "disk_gb": 20, "slots": 50, "price_cents": 1799},
        ],
    },
    {
        "slug": "enshrouded",
        "name": "Enshrouded",
        "category": "survival",
        "description": "Co-op survival action RPG with base building, shroud exploration and bosses.",
        "image": "ghcr.io/aetheris-project/enshrouded:latest",
        "default_port": 15636,
        "min_memory_mb": 4096,
        "presets": [
            {"name": "Flame", "vcpu": 2, "memory_mb": 4096, "disk_gb": 20, "slots": 8, "price_cents": 1099},
            {"name": "Ember", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 16, "price_cents": 2199},
            {"name": "Inferno", "vcpu": 6, "memory_mb": 12288, "disk_gb": 60, "slots": 24, "price_cents": 3299},
        ],
    },
    {
        "slug": "dst",
        "name": "Don't Starve Together",
        "category": "survival",
        "description": "Wilderness survival with seasons, caves and mods across master and cave shards.",
        "image": "ghcr.io/aetheris-project/dst:latest",
        "default_port": 10999,
        "min_memory_mb": 1024,
        "presets": [
            {"name": "Campfire", "vcpu": 1, "memory_mb": 1024, "disk_gb": 5, "slots": 6, "price_cents": 449},
            {"name": "Base", "vcpu": 2, "memory_mb": 2048, "disk_gb": 10, "slots": 12, "price_cents": 849},
            {"name": "Megabase", "vcpu": 4, "memory_mb": 4096, "disk_gb": 20, "slots": 24, "price_cents": 1699},
        ],
    },
    {
        "slug": "tf2",
        "name": "Team Fortress 2",
        "category": "fps",
        "description": "Class-based multiplayer FPS with community servers, plugins and custom maps.",
        "image": "ghcr.io/aetheris-project/tf2:latest",
        "default_port": 27015,
        "min_memory_mb": 2048,
        "presets": [
            {"name": "Scout", "vcpu": 1, "memory_mb": 2048, "disk_gb": 15, "slots": 12, "price_cents": 649},
            {"name": "Soldier", "vcpu": 2, "memory_mb": 4096, "disk_gb": 25, "slots": 24, "price_cents": 1299},
            {"name": "Heavy", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 32, "price_cents": 2499},
        ],
    },
    {
        "slug": "scpsl",
        "name": "SCP: Secret Laboratory",
        "category": "horror",
        "description": "Round-based multiplayer horror with configurable roles, plugins and whitelist.",
        "image": "ghcr.io/aetheris-project/scpsl:latest",
        "default_port": 7777,
        "min_memory_mb": 2048,
        "presets": [
            {"name": "Class-D", "vcpu": 1, "memory_mb": 2048, "disk_gb": 15, "slots": 12, "price_cents": 699},
            {"name": "MTF", "vcpu": 2, "memory_mb": 4096, "disk_gb": 25, "slots": 24, "price_cents": 1399},
            {"name": "SCP", "vcpu": 4, "memory_mb": 8192, "disk_gb": 40, "slots": 40, "price_cents": 2699},
        ],
    },
]


@router.get("/games", response_model=list[GameOut])
def list_games() -> list[GameOut]:
    return [GameOut(**game) for game in GAMES]


@router.get("/games/{slug}", response_model=GameOut)
def get_game(slug: str) -> GameOut:
    for game in GAMES:
        if game["slug"] == slug:
            return GameOut(**game)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

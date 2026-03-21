"""add premium fields

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-03-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('user', sa.Column('premium_until', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'premium_until')
    op.drop_column('user', 'is_premium')

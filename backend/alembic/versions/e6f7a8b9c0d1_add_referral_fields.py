"""add referral fields

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-03-21 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('referral_code', sa.String(), nullable=True))
    op.add_column('user', sa.Column('referred_by_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=True))
    op.add_column('user', sa.Column('referral_count', sa.Integer(), nullable=False, server_default='0'))
    op.create_unique_constraint('uq_user_referral_code', 'user', ['referral_code'])
    op.create_index('ix_user_referral_code', 'user', ['referral_code'])


def downgrade() -> None:
    op.drop_index('ix_user_referral_code', 'user')
    op.drop_constraint('uq_user_referral_code', 'user', type_='unique')
    op.drop_column('user', 'referral_count')
    op.drop_column('user', 'referred_by_id')
    op.drop_column('user', 'referral_code')

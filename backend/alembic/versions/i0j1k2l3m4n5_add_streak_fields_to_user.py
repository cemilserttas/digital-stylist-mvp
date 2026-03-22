"""add streak fields to user

Revision ID: i0j1k2l3m4n5
Revises: h9i0j1k2l3m4
Create Date: 2026-03-22 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = 'i0j1k2l3m4n5'
down_revision = 'h9i0j1k2l3m4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('streak_current', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user', sa.Column('streak_max', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user', sa.Column('streak_last_activity', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'streak_last_activity')
    op.drop_column('user', 'streak_max')
    op.drop_column('user', 'streak_current')

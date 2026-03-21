"""add daily usage fields for freemium gate

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-03-21 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f7a8b9c0d1e2'
down_revision = 'e6f7a8b9c0d1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('suggestions_date', sa.Date(), nullable=True))
    op.add_column('user', sa.Column('suggestions_count_today', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user', sa.Column('chat_date', sa.Date(), nullable=True))
    op.add_column('user', sa.Column('chat_count_today', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('user', 'chat_count_today')
    op.drop_column('user', 'chat_date')
    op.drop_column('user', 'suggestions_count_today')
    op.drop_column('user', 'suggestions_date')

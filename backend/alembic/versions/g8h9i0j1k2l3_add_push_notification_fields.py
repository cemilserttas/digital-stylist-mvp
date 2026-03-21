"""add push notification fields

Revision ID: g8h9i0j1k2l3
Revises: f7a8b9c0d1e2
Create Date: 2026-03-21 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'g8h9i0j1k2l3'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('fcm_token', sa.String(), nullable=True))
    op.add_column('user', sa.Column('push_notifications_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user', sa.Column('push_city', sa.String(), nullable=True))
    op.create_index('ix_user_fcm_token', 'user', ['fcm_token'])


def downgrade() -> None:
    op.drop_index('ix_user_fcm_token', 'user')
    op.drop_column('user', 'push_city')
    op.drop_column('user', 'push_notifications_enabled')
    op.drop_column('user', 'fcm_token')

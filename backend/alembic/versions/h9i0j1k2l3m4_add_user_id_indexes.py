"""add user_id indexes on clothingitem, linkclick, outfitplan

Revision ID: h9i0j1k2l3m4
Revises: g8h9i0j1k2l3
Create Date: 2026-03-21 16:00:00.000000
"""
from alembic import op

revision = 'h9i0j1k2l3m4'
down_revision = 'g8h9i0j1k2l3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_clothingitem_user_id', 'clothingitem', ['user_id'])
    op.create_index('ix_linkclick_user_id', 'linkclick', ['user_id'])
    op.create_index('ix_outfitplan_user_id', 'outfitplan', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_outfitplan_user_id', 'outfitplan')
    op.drop_index('ix_linkclick_user_id', 'linkclick')
    op.drop_index('ix_clothingitem_user_id', 'clothingitem')

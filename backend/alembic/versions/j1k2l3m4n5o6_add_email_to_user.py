"""add email to user

Revision ID: j1k2l3m4n5o6
Revises: i0j1k2l3m4n5
Create Date: 2026-03-22 13:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = 'j1k2l3m4n5o6'
down_revision = 'i0j1k2l3m4n5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('email', sa.String(), nullable=True))
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_column('user', 'email')

"""add airequest table

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-03-22 14:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = 'k2l3m4n5o6p7'
down_revision = 'j1k2l3m4n5o6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'airequest',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('request_type', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=False, server_default='gemini-2.0-flash'),
        sa.Column('input_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('output_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default='success'),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_airequest_user_id', 'airequest', ['user_id'])
    op.create_index('ix_airequest_request_type', 'airequest', ['request_type'])
    op.create_index('ix_airequest_model', 'airequest', ['model'])
    op.create_index('ix_airequest_created_at', 'airequest', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_airequest_created_at', table_name='airequest')
    op.drop_index('ix_airequest_model', table_name='airequest')
    op.drop_index('ix_airequest_request_type', table_name='airequest')
    op.drop_index('ix_airequest_user_id', table_name='airequest')
    op.drop_table('airequest')

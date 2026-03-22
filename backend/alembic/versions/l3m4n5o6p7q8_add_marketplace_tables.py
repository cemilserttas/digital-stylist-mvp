"""add marketplace tables

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-03-22 16:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = 'l3m4n5o6p7q8'
down_revision = 'k2l3m4n5o6p7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # MarketplaceListing
    op.create_table(
        'marketplacelisting',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('seller_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('clothing_item_id', sa.Integer(), sa.ForeignKey('clothingitem.id'), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False, server_default=''),
        sa.Column('price_cents', sa.Integer(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False, server_default='Bon état'),
        sa.Column('size', sa.String(), nullable=True),
        sa.Column('brand', sa.String(), nullable=True),
        sa.Column('category_type', sa.String(), nullable=False, server_default=''),
        sa.Column('color', sa.String(), nullable=False, server_default=''),
        sa.Column('season', sa.String(), nullable=False, server_default=''),
        sa.Column('image_urls', sa.String(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_ml_seller_id', 'marketplacelisting', ['seller_id'])
    op.create_index('ix_ml_status', 'marketplacelisting', ['status'])
    op.create_index('ix_ml_brand', 'marketplacelisting', ['brand'])
    op.create_index('ix_ml_clothing_item_id', 'marketplacelisting', ['clothing_item_id'])
    op.create_index('ix_ml_created_at', 'marketplacelisting', ['created_at'])

    # ShippingAddress
    op.create_table(
        'shippingaddress',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('label', sa.String(), nullable=False, server_default='Maison'),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('line1', sa.String(), nullable=False),
        sa.Column('line2', sa.String(), nullable=True),
        sa.Column('postal_code', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('country', sa.String(), nullable=False, server_default='FR'),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_sa_user_id', 'shippingaddress', ['user_id'])

    # MarketplaceOrder
    op.create_table(
        'marketplaceorder',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('listing_id', sa.Integer(), sa.ForeignKey('marketplacelisting.id'), nullable=False),
        sa.Column('buyer_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('seller_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('shipping_address_id', sa.Integer(), sa.ForeignKey('shippingaddress.id'), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('commission_cents', sa.Integer(), nullable=False),
        sa.Column('seller_payout_cents', sa.Integer(), nullable=False),
        sa.Column('stripe_payment_intent_id', sa.String(), nullable=True),
        sa.Column('tracking_number', sa.String(), nullable=True),
        sa.Column('tracking_carrier', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('shipped_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_mo_listing_id', 'marketplaceorder', ['listing_id'])
    op.create_index('ix_mo_buyer_id', 'marketplaceorder', ['buyer_id'])
    op.create_index('ix_mo_seller_id', 'marketplaceorder', ['seller_id'])
    op.create_index('ix_mo_status', 'marketplaceorder', ['status'])


def downgrade() -> None:
    op.drop_index('ix_mo_status', table_name='marketplaceorder')
    op.drop_index('ix_mo_seller_id', table_name='marketplaceorder')
    op.drop_index('ix_mo_buyer_id', table_name='marketplaceorder')
    op.drop_index('ix_mo_listing_id', table_name='marketplaceorder')
    op.drop_table('marketplaceorder')

    op.drop_index('ix_sa_user_id', table_name='shippingaddress')
    op.drop_table('shippingaddress')

    op.drop_index('ix_ml_created_at', table_name='marketplacelisting')
    op.drop_index('ix_ml_clothing_item_id', table_name='marketplacelisting')
    op.drop_index('ix_ml_brand', table_name='marketplacelisting')
    op.drop_index('ix_ml_status', table_name='marketplacelisting')
    op.drop_index('ix_ml_seller_id', table_name='marketplacelisting')
    op.drop_table('marketplacelisting')

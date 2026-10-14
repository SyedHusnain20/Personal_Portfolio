"""knowledge notes for the Naini chatbot

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-15 03:40:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('knowledge',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_sort_order'), 'knowledge', ['sort_order'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_knowledge_sort_order'), table_name='knowledge')
    op.drop_table('knowledge')

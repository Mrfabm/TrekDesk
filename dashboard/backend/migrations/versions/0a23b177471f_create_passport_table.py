"""create passport table

Revision ID: 0a23b177471f
Revises: 
Create Date: 2024-12-28 12:04:30.174087

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a23b177471f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'passport_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=False),
        sa.Column('passport_number', sa.String(), nullable=False),
        sa.Column('passport_expiry', sa.Date(), nullable=False),
        sa.Column('nationality', sa.String(), nullable=True),
        sa.Column('place_of_birth', sa.String(), nullable=True),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('document_file', sa.String(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('source_file', sa.String(), nullable=True),
        sa.Column('extraction_status', sa.String(), nullable=True),
        sa.Column('extraction_error', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('passport_number')
    )
    op.create_index(op.f('ix_passport_data_id'), 'passport_data', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_passport_data_id'), table_name='passport_data')
    op.drop_table('passport_data') 
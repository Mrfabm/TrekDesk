"""add passport extraction columns

Revision ID: add_passport_extraction_columns
Revises: create_passport_table
Create Date: 2024-03-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'add_passport_extraction_columns'
down_revision = 'create_passport_table'
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to passport_data table
    op.add_column('passport_data', sa.Column('confidence_score', sa.Float(), nullable=True))
    op.add_column('passport_data', sa.Column('source_file', sa.String(), nullable=True))
    op.add_column('passport_data', sa.Column('extraction_status', sa.String(), nullable=True))
    op.add_column('passport_data', sa.Column('extraction_error', sa.String(), nullable=True))

def downgrade():
    # Remove the new columns
    op.drop_column('passport_data', 'confidence_score')
    op.drop_column('passport_data', 'source_file')
    op.drop_column('passport_data', 'extraction_status')
    op.drop_column('passport_data', 'extraction_error') 
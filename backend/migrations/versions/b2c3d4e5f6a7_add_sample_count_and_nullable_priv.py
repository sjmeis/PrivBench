"""Add sample_count to benchmark_module and make privatized_dataset_id nullable

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Add sample_count column with default 1000
    op.add_column(
        'benchmark_module',
        sa.Column('sample_count', sa.Integer(), nullable=False, server_default='1000'),
    )

    # Make privatized_dataset_id nullable in benchmark_score
    with op.batch_alter_table('benchmark_score') as batch_op:
        batch_op.alter_column(
            'privatized_dataset_id',
            existing_type=sa.Integer(),
            nullable=True,
        )

    # Set specific sample counts for existing modules
    op.execute(
        "UPDATE benchmark_module SET sample_count = 500 WHERE name = 'CarliniExposure'"
    )
    op.execute(
        "UPDATE benchmark_module SET sample_count = 100 WHERE name = 'Coherence'"
    )


def downgrade():
    with op.batch_alter_table('benchmark_score') as batch_op:
        batch_op.alter_column(
            'privatized_dataset_id',
            existing_type=sa.Integer(),
            nullable=False,
        )

    op.drop_column('benchmark_module', 'sample_count')

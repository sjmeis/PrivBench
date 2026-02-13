"""Add module_dataset_compatibility, module_dataset_choice tables and benchmark_module columns

Revision ID: a1b2c3d4e5f6
Revises: 6d342d6fd65a
Create Date: 2025-12-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '6d342d6fd65a'
branch_labels = None
depends_on = None


def upgrade():
    # Create module_dataset_compatibility association table
    op.create_table(
        'module_dataset_compatibility',
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['module_id'], ['benchmark_module.id']),
        sa.ForeignKeyConstraint(['dataset_id'], ['dataset.id']),
        sa.PrimaryKeyConstraint('module_id', 'dataset_id'),
    )

    # Create module_dataset_choice table
    op.create_table(
        'module_dataset_choice',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('submission_id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['submission_id'], ['submission.id']),
        sa.ForeignKeyConstraint(['module_id'], ['benchmark_module.id']),
        sa.ForeignKeyConstraint(['dataset_id'], ['dataset.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('submission_id', 'module_id', name='uq_submission_module_dataset_choice'),
    )

    # Make benchmark_module.dataset_id nullable
    with op.batch_alter_table('benchmark_module') as batch_op:
        batch_op.alter_column(
            'dataset_id',
            existing_type=sa.Integer(),
            nullable=True,
        )

    # Add use_gpu and is_installed columns to benchmark_module
    op.add_column('benchmark_module', sa.Column('use_gpu', sa.Boolean(), default=False))
    op.add_column('benchmark_module', sa.Column('is_installed', sa.Boolean(), default=False))


def downgrade():
    op.drop_column('benchmark_module', 'is_installed')
    op.drop_column('benchmark_module', 'use_gpu')

    with op.batch_alter_table('benchmark_module') as batch_op:
        batch_op.alter_column(
            'dataset_id',
            existing_type=sa.Integer(),
            nullable=False,
        )

    op.drop_table('module_dataset_choice')
    op.drop_table('module_dataset_compatibility')

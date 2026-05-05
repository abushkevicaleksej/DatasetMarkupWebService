"""a little changes with relations

Revision ID: 05d63125c0c8
Revises: f8f9dd7d08a1
Create Date: 2026-05-05 21:02:22.568714

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '05d63125c0c8'
down_revision: Union[str, Sequence[str], None] = 'f8f9dd7d08a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

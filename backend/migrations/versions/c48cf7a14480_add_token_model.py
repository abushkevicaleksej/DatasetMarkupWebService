"""add token model

Revision ID: c48cf7a14480
Revises: 69c093ff785b
Create Date: 2026-05-06 12:01:01.007563

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c48cf7a14480'
down_revision: Union[str, Sequence[str], None] = '69c093ff785b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

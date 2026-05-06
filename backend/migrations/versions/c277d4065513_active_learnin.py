"""active learnin

Revision ID: c277d4065513
Revises: c48cf7a14480
Create Date: 2026-05-06 20:53:26.378947

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c277d4065513'
down_revision: Union[str, Sequence[str], None] = 'c48cf7a14480'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

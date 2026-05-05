"""files model relations fixes

Revision ID: 69c093ff785b
Revises: 05d63125c0c8
Create Date: 2026-05-05 21:03:55.342750

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69c093ff785b'
down_revision: Union[str, Sequence[str], None] = '05d63125c0c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

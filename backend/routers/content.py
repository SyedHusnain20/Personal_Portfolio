"""Wire the generic CRUD factory to the three content tables."""

from sqlalchemy import update

from ..models import Certificate, Experience, Project
from ..schemas import (
    CertificateIn,
    CertificateOut,
    ExperienceIn,
    ExperienceOut,
    ProjectIn,
    ProjectOut,
)
from .crud import build_resource_routers


def _only_one_featured(db, project: Project) -> None:
    """The home page has a single featured slot; featuring one project un-features the rest."""
    if project.is_featured:
        db.execute(
            update(Project)
            .where(Project.id != project.id, Project.is_featured.is_(True))
            .values(is_featured=False)
        )


projects_public, projects_admin = build_resource_routers(
    name="projects",
    model=Project,
    create_schema=ProjectIn,
    out_schema=ProjectOut,
    on_save=_only_one_featured,
)
certificates_public, certificates_admin = build_resource_routers(
    name="certificates",
    model=Certificate,
    create_schema=CertificateIn,
    out_schema=CertificateOut,
)
experience_public, experience_admin = build_resource_routers(
    name="experience",
    model=Experience,
    create_schema=ExperienceIn,
    out_schema=ExperienceOut,
)

public_routers = [projects_public, certificates_public, experience_public]
admin_routers = [projects_admin, certificates_admin, experience_admin]

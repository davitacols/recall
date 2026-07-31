from django.urls import include, path


urlpatterns = [
    path("api/agile/", include("apps.agile.urls_fresh")),
    path("api/knowledge/", include("apps.knowledge.urls")),
    path("api/decisions/", include("apps.decisions.urls")),
    path("api/business/", include("apps.business.urls")),
    path("api/organizations/", include("apps.organizations.urls")),
    path("api/integrations/", include("apps.integrations.urls")),
    path("api/integrations/fresh/", include("apps.integrations.urls_fresh")),
]

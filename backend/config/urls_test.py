from django.urls import include, path


urlpatterns = [
    path("api/agile/", include("apps.agile.urls_fresh")),
    path("api/knowledge/", include("apps.knowledge.urls")),
    path("api/decisions/", include("apps.decisions.urls")),
    path("api/business/", include("apps.business.urls")),
    path("api/organizations/", include("apps.organizations.urls")),
    path("api/integrations/", include("apps.integrations.urls")),
    path("api/integrations/fresh/", include("apps.integrations.urls_fresh")),
    # Mirrors config/urls.py. Their absence here made the search tests fail
    # with 404s that looked like product bugs but were a gap in this file —
    # the endpoints answer fine in production.
    path("api/recall/", include("apps.conversations.unified_urls")),
    path("api/recall/search/", include("apps.knowledge.bm25_urls")),
]

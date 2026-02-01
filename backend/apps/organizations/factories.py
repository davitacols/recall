import factory
from factory.django import DjangoModelFactory
from faker import Faker
from apps.organizations.models import User, Organization
from apps.conversations.models import Conversation, ConversationReply, ActionItem
from apps.decisions.models import Decision
from apps.agile.models import Sprint, Project, Issue

fake = Faker()

class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = Organization
    
    name = factory.Faker('company')
    slug = factory.Faker('slug')
    description = factory.Faker('text')

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    
    username = factory.Faker('user_name')
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    organization = factory.SubFactory(OrganizationFactory)

class ConversationFactory(DjangoModelFactory):
    class Meta:
        model = Conversation
    
    organization = factory.SubFactory(OrganizationFactory)
    author = factory.SubFactory(UserFactory)
    title = factory.Faker('sentence')
    content = factory.Faker('text')
    post_type = 'update'
    priority = 'medium'

class DecisionFactory(DjangoModelFactory):
    class Meta:
        model = Decision
    
    organization = factory.SubFactory(OrganizationFactory)
    conversation = factory.SubFactory(ConversationFactory)
    title = factory.Faker('sentence')
    description = factory.Faker('text')
    decision_maker = factory.SubFactory(UserFactory)
    status = 'proposed'
    rationale = factory.Faker('text')

class SprintFactory(DjangoModelFactory):
    class Meta:
        model = Sprint
    
    name = factory.Faker('word')
    project = factory.SubFactory(lambda: ProjectFactory())
    start_date = factory.Faker('date_time')
    end_date = factory.Faker('date_time')

class IssueFactory(DjangoModelFactory):
    class Meta:
        model = Issue
    
    sprint = factory.SubFactory(SprintFactory)
    title = factory.Faker('sentence')
    description = factory.Faker('text')
    status = 'open'
    priority = 'medium'

class ProjectFactory(DjangoModelFactory):
    class Meta:
        model = Project
    
    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Faker('word')
    description = factory.Faker('text')
    lead = factory.SubFactory(UserFactory)

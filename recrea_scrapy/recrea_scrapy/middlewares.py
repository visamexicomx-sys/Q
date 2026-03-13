import random
from scrapy import signals
from scrapy.downloadermiddlewares.retry import RetryMiddleware as BaseRetry

class RotateUserAgentMiddleware:
    def __init__(self, user_agents):
        self.user_agents = user_agents

    @classmethod
    def from_crawler(cls, crawler):
        return cls(crawler.settings.getlist('USER_AGENTS'))

    def process_request(self, request, spider):
        request.headers['User-Agent'] = random.choice(self.user_agents)

import datetime
import hashlib

class SovereignNode:
    def __init__(self, start_date):
        self.start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        self.tenure = (datetime.datetime.now() - self.start_date).days
        self.incentive_pool = 0.0

    def validate_tenure(self):
        print(f"Node Age: {self.tenure} days")
        if self.tenure < 90:
            return "TIER_0: PENDING. No claims allowed."
        elif 90 <= self.tenure < 180:
            return "TIER_1: VERIFIED. 25% Liquid."
        else:
            return "TIER_2: SOVEREIGN. Full Access."

# Simulation for a new node joining Feb 17, 2026
node = SovereignNode("2026-02-17")
print(f"Status: {node.validate_tenure()}")

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
import conftest_common  # noqa: E402

conftest_common.setup(__file__)

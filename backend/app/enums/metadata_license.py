from enum import Enum

class License(Enum):
    MIT = "MIT"
    APACHE_2_0 = "Apache 2.0"
    GPLV3 = "GPLv3"
    BSD = "BSD"

    def __str__(self):
        return self.value


import random

DEFAULT_PROMPTS = [
    "예시1",
    "예시2",
    "예시3",
    "예시4",
    "예시5",
    "예시6",
    "예시7",
    "예시8",
    "예시9",
    "예시10",
    "예시11",
    "예시12",
    "예시13",
    "예시14",
    "예시15",
    "예시16",
    "예시17",
    "예시18",
    "예시19",
    "예시20",
    "예시21",
    "예시22",
    "예시23",
    "예시24",
    "예시25",
    "예시26",
    "예시27",
    "예시28",
]

def get_random_prompts(count):
    if count > len(DEFAULT_PROMPTS):
        raise ValueError("문장 수 보다, 인원이 많습니다.")

    return random.sample(DEFAULT_PROMPTS,count)
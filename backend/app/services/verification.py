def verify_tree_submission(
    tree_name: str,
    latitude: float,
    longitude: float,
    description: str
):
    """
    Basic validation for tree submission.

    This will later be replaced/extended
    with AI verification.
    """

    if not tree_name.strip():
        return False

    if not description.strip():
        return False

    if not (-90 <= latitude <= 90):
        return False

    if not (-180 <= longitude <= 180):
        return False

    return True
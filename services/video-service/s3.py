import boto3
import os
from botocore.config import Config


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=os.environ["AWS_REGION"],
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        endpoint_url=f"https://s3.{os.environ['AWS_REGION']}.amazonaws.com",
        config=Config(signature_version="s3v4")
    )


def generate_upload_url(video_id: str, content_type: str = "video/mp4") -> dict:
    """
    Generate a presigned PUT URL so the browser can upload directly to S3.
    The s3_key is derived from the video_id so it's predictable and unique.
    URL expires in 15 minutes.
    """
    s3 = get_s3_client()
    bucket = os.environ["AWS_S3_BUCKET"]

    # Use a consistent key pattern: videos/<video_id>.mp4
    extension = content_type.split("/")[-1]  # e.g. "mp4" from "video/mp4"
    s3_key = f"videos/{video_id}.{extension}"

    upload_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=900,  # 15 minutes to complete the upload
    )

    return {"upload_url": upload_url, "s3_key": s3_key}


def generate_stream_url(s3_key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned GET URL so the browser can stream a video.
    URL expires in 1 hour by default.
    """
    s3 = get_s3_client()
    bucket = os.environ["AWS_S3_BUCKET"]

    stream_url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": bucket,
            "Key": s3_key,
        },
        ExpiresIn=expires_in,
    )

    return stream_url


def generate_thumbnail_upload_url(video_id: str) -> dict:
    """Generate a presigned PUT URL for thumbnail image upload."""
    s3 = get_s3_client()
    bucket = os.environ["AWS_S3_BUCKET"]
    s3_key = f"thumbnails/{video_id}.jpg"

    upload_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket,
            "Key": s3_key,
            "ContentType": "image/jpeg",
        },
        ExpiresIn=900,
    )

    return {"upload_url": upload_url, "s3_key": s3_key}


def delete_s3_object(s3_key: str) -> None:
    """Delete a file from S3 — called when a video record is deleted."""
    s3 = get_s3_client()
    bucket = os.environ["AWS_S3_BUCKET"]
    s3.delete_object(Bucket=bucket, Key=s3_key)

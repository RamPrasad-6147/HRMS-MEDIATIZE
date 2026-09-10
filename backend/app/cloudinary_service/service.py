import io
from typing import Dict, Optional, Tuple

import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status

from app.cloudinary_service.config import configure_cloudinary

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_image_file(file: UploadFile, file_bytes: bytes) -> None:
    """
    Validate file presence, size, content type, and file extension.
    """
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 5 MB.",
        )

    # Validate content-type header
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP.",
        )

    # Validate file extension
    filename = (file.filename or "").lower()
    extension = filename.split(".")[-1] if "." in filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file extension. Allowed extensions: .jpg, .jpeg, .png, .webp",
        )


def upload_image(file_bytes: bytes, folder: str = "hrms/profile_photos") -> Dict[str, str]:
    """
    Upload image binary bytes to Cloudinary and return secure URL and public_id.
    """
    configure_cloudinary()
    try:
        response = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="image",
            overwrite=True,
        )
        return {
            "url": response.get("secure_url") or response.get("url"),
            "public_id": response.get("public_id"),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cloudinary upload failed: {str(exc)}",
        )


def delete_image(public_id: str) -> bool:
    """
    Delete an image asset from Cloudinary using its public_id.
    """
    if not public_id:
        return False
    configure_cloudinary()
    try:
        response = cloudinary.uploader.destroy(public_id, resource_type="image")
        return response.get("result") == "ok"
    except Exception as exc:
        print(f"[Warning] Cloudinary asset deletion failed for {public_id}: {exc}")
        return False


def replace_image(
    old_public_id: Optional[str],
    new_file_bytes: bytes,
    folder: str = "hrms/profile_photos",
) -> Dict[str, str]:
    """
    Upload new image asset, then remove the previous image asset from Cloudinary.
    """
    upload_result = upload_image(new_file_bytes, folder=folder)

    if old_public_id:
        delete_image(old_public_id)

    return upload_result


ALLOWED_DOCUMENT_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg"
}


def validate_document_file(file: UploadFile, file_bytes: bytes) -> None:
    """
    Validate document file presence, size, and allowed file extension.
    """
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 5 MB.",
        )

    filename = (file.filename or "").lower()
    extension = filename.split(".")[-1] if "." in filename else ""
    if extension not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid file extension '.{extension}'. "
                "Allowed extensions: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG."
            ),
        )


def upload_document(
    file_bytes: bytes,
    filename: str,
    folder: str = "hrms/work_reports",
) -> Dict[str, str]:
    """
    Upload document file to Cloudinary with auto resource type and return URL and public_id.
    """
    configure_cloudinary()
    try:
        response = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="auto",
            public_id=None,
        )
        return {
            "url": response.get("secure_url") or response.get("url"),
            "public_id": response.get("public_id"),
            "filename": filename,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cloudinary document upload failed: {str(exc)}",
        )


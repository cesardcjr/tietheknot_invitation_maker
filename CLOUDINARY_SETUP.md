# Cloudinary setup for TieTheKnot invitation images

The invitation app uploads images directly from the browser with a short-lived signature created by the TieTheKnot backend. The Cloudinary API secret is never sent to the browser.

## 1. Create the Cloudinary account

1. Open [Cloudinary](https://cloudinary.com/users/register_free) and create a free account.
2. Verify the account and open the Cloudinary Console.
3. Go to **Settings → API Keys**.
4. Copy the **Cloud name**, **API key**, and **API secret**. Treat the API secret like a password.

Cloudinary documents the credential location in its [credentials guide](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials).

## 2. Create a signed upload preset

1. In the Cloudinary Console, go to **Settings → Upload → Upload presets**.
2. Select **Add upload preset**.
3. Set the preset name to `tietheknot_invitations`.
4. Set **Signing mode** to **Signed**.
5. Under upload controls, allow only image formats used by the app: `jpg`, `jpeg`, `png`, `webp`, and `avif`.
6. Set the maximum file size to `8 MB`.
7. Optionally add an incoming transformation that limits images to approximately 2400 × 2400 pixels while preserving aspect ratio. This reduces storage and delivery usage.
8. Save the preset.

Cloudinary explains signed presets and their security behavior in the [upload preset documentation](https://cloudinary.com/documentation/upload_presets).

## 3. Configure the backend

Open the deployed backend's environment-variable settings or its local `.env` file and add:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=tietheknot_invitations
ALLOWED_ORIGINS=https://planner.example.com,https://invite.example.com
```

Important:

- Add these values to the backend only.
- Never create a `VITE_CLOUDINARY_API_SECRET` variable.
- Never commit the real `.env` file.
- Keep existing `MONGO_URI` and `JWT_SECRET` values unchanged.
- Set `INVITATION_TOKEN_SECRET` to a different long random value for guest-link signing. The backend falls back to `JWT_SECRET` only for backward compatibility.
- Restart or redeploy the backend after changing environment variables.

## 4. Configure the invitation frontend

Create `tietheknot_invitation_maker/.env.local` from `.env.example`:

```env
VITE_API_URL=https://your-api.example.com/api
VITE_PUBLIC_URL=https://invite.example.com
VITE_PLANNER_URL=https://planner.example.com
```

`VITE_PUBLIC_URL` is used when personalized links and QR codes are created. It must match the final public invitation domain.

Also configure the planner frontend so its Invitation Studio button opens the new application:

```env
VITE_INVITATION_APP_URL=https://invite.example.com
```

Rebuild or redeploy both frontends after changing `VITE_` variables.

## 5. Test an upload

1. Start the backend, planner, and invitation app.
2. Sign in to Invitation Studio with an active wedding-planner account.
3. In **Design**, upload a JPG, PNG, WebP, or AVIF image smaller than 8 MB.
4. Confirm that the preview changes.
5. Select **Save design**.
6. In Cloudinary, open **Assets / Media Library** and verify that the image appears under:

   `tietheknot/<user-id>/invitations`

7. Remove the image in Invitation Studio and confirm that the Cloudinary asset is deleted.

## How the secure upload works

1. The authenticated invitation app requests `/api/media/signature`.
2. The backend signs a timestamp, account-specific folder, and optional upload preset using the API secret.
3. The browser sends the file and signature directly to Cloudinary over HTTPS.
4. Cloudinary returns the secure image URL and public ID.
5. The invitation design stores the URL and metadata in MongoDB.

This follows Cloudinary's recommended [signed browser upload flow](https://cloudinary.com/documentation/node_image_and_video_upload) and [authentication-signature guidance](https://cloudinary.com/documentation/authentication_signatures).

## Troubleshooting

- **Cloudinary is not configured:** Confirm all three Cloudinary credentials exist on the backend and restart it.
- **Invalid signature:** Confirm the API secret is correct and that the configured preset name exactly matches the signed Cloudinary preset.
- **Upload blocked by CORS:** Cloudinary uploads go directly to Cloudinary. If the signature request is blocked, add the invitation application's exact origin to `ALLOWED_ORIGINS` on the TieTheKnot backend.
- **Invitation link opens the wrong domain:** Correct `VITE_PUBLIC_URL`, rebuild the invitation frontend, and regenerate or recopy the link.
- **Image remains after removal:** Check that its public ID begins with the signed-in user's `tietheknot/<user-id>/invitations/` folder. The backend intentionally refuses to delete assets outside that account folder.

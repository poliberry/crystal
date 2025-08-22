<a name="readme-top"></a>

# Private. Secure. Open source. Its the new way to chat online.
![Something big is coming.](https://pbs.twimg.com/profile_banners/1952283485856829440/1755849777/1500x500 "Crystal - Private. Secure. Open source. Its the new way to chat online.")

[![GitHub license](https://flat.badgen.net/github/license/endr-tech/crystal?icon=github&color=black&scale=1.01)](https://github.com/endr-tech/crystal/blob/main/LICENSE "GitHub license")
[![Maintenance](https://flat.badgen.net/static/Maintained/yes?icon=github&color=black&scale=1.01)](https://github.com/endr-tech/crystal/commits/main "Maintenance")
[![GitHub branches](https://flat.badgen.net/github/branches/endr-tech/crystal?icon=github&color=black&scale=1.01)](https://github.com/endr-tech/crystal/branches "GitHub branches")
[![Github commits](https://flat.badgen.net/github/commits/endr-tech/crystal?icon=github&color=black&scale=1.01)](https://github.com/endr-tech/crystal/commits "Github commits")
[![GitHub issues](https://flat.badgen.net/github/issues/endr-tech/crystal?icon=github&color=black&scale=1.01)](https://github.com/endr-tech/crystal/issues "GitHub issues")
[![GitHub pull requests](https://flat.badgen.net/github/prs/endr-tech/crystal?icon=github&color=black&scale=1.01)](https://github.com/endr-tech/crystal/pulls "GitHub pull requests")

<!-- Table of Contents -->
<details>

<summary>

# ❓ What is Crystal?

Crystal is a completely private and open source chat platform, designed using existing technologies like LiveKit for audio/video calling and stage channels, and Socket.IO for message and event handling.
Crystal is designed with security in mind, meaning Crystal will have soon to be developed technology such as:

- Tigress, our open source text moderation engine, utilising existing LLM models to efficiently digest, rank and take action against inappropriate text conversations
- Flora, our open source image moderation system, using AI to detect inappropriate content in images, and advise of the best course of action
- Falkon, a open source user and case management system used by ENDR to log and track user accounts and opened cases (either by Tigress, Flora, or our Trust & Saftey team), to analyse patterns in conversations sent in channels and conversations, and plan preventative mesaures such as IP-ban evading.

</summary>

</details>

<br />

## :toolbox: Getting Started

1. Make sure **Git** and **NodeJS** is installed.
2. Clone this repository to your local computer.
3. Create `.env` file in **root** directory.
4. Contents of `.env`:

```env
# .env

# disabled next.js telemetry
NEXT_TELEMETRY_DISABLED=1

# clerk auth keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# clerk redirect urls
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# neon databse url
DATABASE_URL="postgresql://<user>:<password>@<host>:<post>/discord-clone?sslmode=require"

# uploading api key and app id
UPLOADTHING_SECRET=sk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
UPLOADTHING_APP_ID=xxxxxxxxxxxxx

# app base url
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# livekit api keys and public url
LIVEKIT_API_KEY=XXXXXXXXXXXXXXXXX
LIVEKIT_API_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_LIVEKIT_URL=wss://discord-clone-xxxxxxxxxx.livekit.cloud

```

5. **Next.js Telemetry Disabled:**

   - Visit the Next.js documentation or repository.
   - Find the instructions to disable telemetry.
   - Set `NEXT_TELEMETRY_DISABLED` to `1` in your `.env` file.

6. **Clerk Authentication Keys:**

   - Go to the Clerk website and sign in to your account.
   - Navigate to the settings or API keys section.
   - Generate or locate your Clerk publishable and secret keys.
   - Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` accordingly in the `.env` file.

7. **Clerk Redirect URLs:**

   - Refer to the Clerk documentation or settings.
   - Set the required URLs for sign-in, sign-up, after sign-in, and after sign-up.
   - Assign these URLs to `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` respectively in the `.env` file.

8. **Neon Database URL:**

   - Access your database provider (e.g., PostgreSQL).
   - Retrieve the necessary connection details such as username, password, host, and port.
   - Construct the database URL using the obtained information and SSL mode.
   - Assign the constructed URL to `DATABASE_URL` in the `.env` file.

9. **Uploading API Key and App ID:**

   - Go to the UploadThing website or application.
   - Find the section for API keys or account settings.
   - Generate or locate your secret key and app ID.
   - Set `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` in the `.env` file accordingly.

10. **App Base URL:**

- Determine the base URL of your application.
- Set `NEXT_PUBLIC_BASE_URL` to the base URL in the `.env` file.

11. **Livekit API Keys and Public URL:**

- Visit the Livekit website or dashboard.
- Navigate to API settings or keys section.
- Generate or locate your API key and secret.
- Set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_LIVEKIT_URL` in the `.env` file according to the obtained information.

12. Save and Secure:

    - Save the changes to the `.env.local` file.

13. Install Project Dependencies using `npm install --legacy-peer-deps` or `yarn install --legacy-peer-deps`.

14. Now app is fully configured 👍 and you can start using this app using either one of `npm run dev` or `yarn dev`.

**NOTE:** Please make sure to keep your API keys and configuration values secure and do not expose them publicly.

## :raised_hands: Contribute

To contribute to Crystal, check out the [Contributing section](https://github.com/endr-tech/crystal/blob/main/CONTRIBUTING.md) on how to contribute to the project.

If you have any questions, please reach out on the ENDR Developer Hub Discord server, on the Crystal Discord server, or in our official servers on this very platform, Crystal!


## :gem: Acknowledgements

Useful resources and dependencies that are used in Crystal.

- Thanks to CodeWithAntonio: https://codewithantonio.com/
- [@clerk/nextjs](https://www.npmjs.com/package/@clerk/nextjs): ^4.29.9
- [@clerk/themes](https://www.npmjs.com/package/@clerk/themes): ^1.7.10
- [@emoji-mart/data](https://www.npmjs.com/package/@emoji-mart/data): ^1.1.2
- [@emoji-mart/react](https://www.npmjs.com/package/@emoji-mart/react): ^1.1.1
- [@hookform/resolvers](https://www.npmjs.com/package/@hookform/resolvers): ^3.3.4
- [@livekit/components-react](https://www.npmjs.com/package/@livekit/components-react): ^2.0.5
- [@livekit/components-styles](https://www.npmjs.com/package/@livekit/components-styles): ^1.0.11
- [@prisma/client](https://www.npmjs.com/package/@prisma/client): ^5.11.0
- [@radix-ui/react-avatar](https://www.npmjs.com/package/@radix-ui/react-avatar): ^1.0.4
- [@radix-ui/react-dialog](https://www.npmjs.com/package/@radix-ui/react-dialog): ^1.0.5
- [@radix-ui/react-dropdown-menu](https://www.npmjs.com/package/@radix-ui/react-dropdown-menu): ^2.0.6
- [@radix-ui/react-label](https://www.npmjs.com/package/@radix-ui/react-label): ^2.0.2
- [@radix-ui/react-popover](https://www.npmjs.com/package/@radix-ui/react-popover): ^1.0.7
- [@radix-ui/react-scroll-area](https://www.npmjs.com/package/@radix-ui/react-scroll-area): ^1.0.5
- [@radix-ui/react-select](https://www.npmjs.com/package/@radix-ui/react-select): ^2.0.0
- [@radix-ui/react-separator](https://www.npmjs.com/package/@radix-ui/react-separator): ^1.0.3
- [@radix-ui/react-slot](https://www.npmjs.com/package/@radix-ui/react-slot): ^1.0.2
- [@radix-ui/react-tooltip](https://www.npmjs.com/package/@radix-ui/react-tooltip): ^1.0.7
- [@tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query): ^4.35.3
- [@uploadthing/react](https://www.npmjs.com/package/@uploadthing/react): ^6.4.1
- [axios](https://www.npmjs.com/package/axios): ^1.6.8
- [class-variance-authority](https://www.npmjs.com/package/class-variance-authority): ^0.7.0
- [clsx](https://www.npmjs.com/package/clsx): ^2.1.0
- [cmdk](https://www.npmjs.com/package/cmdk): ^1.0.0
- [dayjs](https://www.npmjs.com/package/dayjs): ^1.11.13
- [emoji-mart](https://www.npmjs.com/package/emoji-mart): ^5.5.2
- [livekit-server-sdk](https://www.npmjs.com/package/livekit-server-sdk): ^2.1.2
- [lucide-react](https://www.npmjs.com/package/lucide-react): ^0.363.0
- [next](https://www.npmjs.com/package/next): 14.1.4
- [next-themes](https://www.npmjs.com/package/next-themes): ^0.3.0
- [query-string](https://www.npmjs.com/package/query-string): ^9.0.0
- [react](https://www.npmjs.com/package/react): ^18
- [react-dom](https://www.npmjs.com/package/react-dom): ^18
- [react-hook-form](https://www.npmjs.com/package/react-hook-form): ^7.51.1
- [socket.io](https://www.npmjs.com/package/socket.io): ^4.7.5
- [socket.io-client](https://www.npmjs.com/package/socket.io-client): ^4.7.5
- [tailwind-merge](https://www.npmjs.com/package/tailwind-merge): ^2.2.2
- [tailwindcss-animate](https://www.npmjs.com/package/tailwindcss-animate): ^1.0.7
- [uploadthing](https://www.npmjs.com/package/uploadthing): ^6.7.0
- [uuid](https://www.npmjs.com/package/uuid): ^9.0.1
- [zod](https://www.npmjs.com/package/zod): ^3.22.4
- [zustand](https://www.npmjs.com/package/zustand): ^4.5.2
- [@types/node](https://www.npmjs.com/package/@types/node): ^20
- [@types/react](https://www.npmjs.com/package/@types/react): ^18
- [@types/react-dom](https://www.npmjs.com/package/@types/react-dom): ^18
- [@types/uuid](https://www.npmjs.com/package/@types/uuid): ^9.0.8
- [autoprefixer](https://www.npmjs.com/package/autoprefixer): ^10.0.1
- [eslint](https://www.npmjs.com/package/eslint): ^8
- [eslint-config-next](https://www.npmjs.com/package/eslint-config-next): 14.1.4
- [postcss](https://www.npmjs.com/package/postcss): ^8
- [prisma](https://www.npmjs.com/package/prisma): ^5.11.0
- [tailwindcss](https://www.npmjs.com/package/tailwindcss): ^3.3.0
- [typescript](https://www.npmjs.com/package/typescript): ^5

## :books: Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## :page_with_curl: Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## :page_with_curl: Deploy on Railway

Deploying your Next.js app on Railway.app is simple and straightforward.

1. **Sign up or Log in:**

   - Head over to [Railway.app](https://railway.app/) and either sign up for a new account or log in to your existing one.

2. **Connect Repository:**

   - Connect your project repository (e.g., GitHub, GitLab, Bitbucket) to Railway.

3. **Configure Environment Variables:**

   - Set up your environment variables in Railway's dashboard or using their CLI. Ensure you include all required variables as per your project's configuration.

4. **Set Up Build Command:**

   - Configure your build command to ensure Railway can build and deploy your Next.js app correctly. Typically, this command will be `yarn build` or `npm run build`.

5. **Deploy:**

   - Trigger the deployment process either from Railway's dashboard or through their CLI.

6. **Monitor Deployment:**

   - Once deployed, monitor the deployment process and check for any errors or warnings in Railway's dashboard.

7. **Custom Domain (Optional):**
   - If you have a custom domain, you can set it up with Railway to point to your deployed Next.js app.

For more detailed instructions or troubleshooting, refer to [Railway documentation](https://docs.railway.app/).

## :star: Give A Star

You can also give this repository a star to show more people and they can use this repository.

## :star2: Star History

<a href="https://star-history.com/#endr-tech/crystal&Timeline">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=endr-tech/crystal&type=Timeline&theme=dark" />
  <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=endr-tech/crystal&type=Timeline" />
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=endr-tech/crystal&type=Timeline" />
</picture>
</a>

<br />
<p align="right">(<a href="#readme-top">back to top</a>)</p>

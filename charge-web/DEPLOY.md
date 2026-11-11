# Put Charge online with your own domain

You need three things: a place that runs the site (Vercel), a place that keeps the data (Turso), and a domain name.
All three have free or cheap plans. Check each site for its current limits and prices, they change.

Your computer stays as it is. `npm run dev` keeps working for local testing.

## 1. Put the code on GitHub

1. Create a free account on github.com and make a new **private** repository called `charge`.
2. In the `charge-web` folder run:
   ```
   git init
   git add .
   git commit -m "Charge"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/charge.git
   git push -u origin main
   ```
   Your `.env.local`, `.env.production` and the `data` folder are ignored, so your secrets and local data stay on your computer.

## 2. Create the database (Turso)

1. Sign up at turso.tech and create a database. Pick the region closest to your users.
2. Open the database and copy its URL. It starts with `libsql://`.
3. Create a token for it (in the database page, look for "Create token") and copy it.
4. In the `charge-web` folder, create a file named `.env.production` with:
   ```
   DATABASE_URL=libsql://your-database-name.turso.io
   DATABASE_AUTH_TOKEN=paste-the-token-here
   ```
5. Create the tables in the online database:
   ```
   npm run db:push:prod
   ```
   Run this command again whenever an update adds tables.

## 3. Publish the site (Vercel)

1. Sign up at vercel.com with your GitHub account and choose **Add New, Project**, then pick the `charge` repository.
2. Before pressing Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `BETTER_AUTH_SECRET` | a long random string (at least 32 characters; a password generator works) |
   | `BETTER_AUTH_URL` | `https://your-project.vercel.app` for now, your domain later |
   | `NEXT_PUBLIC_APP_URL` | the same address as above |
   | `DATABASE_URL` | the Turso URL |
   | `DATABASE_AUTH_TOKEN` | the Turso token |
   | `ADMIN_EMAILS` | optional, your email, so you can delete any community message |

3. Press **Deploy**. After a minute you get an address like `charge-xxxx.vercel.app`. Open it, sign up, and check that it works.

Vercel's free plan is meant for personal, non-commercial projects. If you start charging people or running ads, look at their paid plan.

## 4. Connect your domain

1. Buy a domain from a registrar (Namecheap, Porkbun, Cloudflare and others sell `.com` names for roughly 10 to 15 dollars a year).
2. In Vercel open the project, then **Settings, Domains**, and add your domain (for example `chargeapp.com`). Vercel shows the DNS records to add.
3. At your registrar, open the DNS settings for the domain and add the records Vercel shows. Usually that is one `A` record for the bare domain and one `CNAME` record for `www`.
4. Wait a few minutes up to an hour. Vercel turns on HTTPS by itself.
5. Go back to **Environment Variables** and change `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://chargeapp.com` (your real domain). If you also want `www` to work for sign-in, add `TRUSTED_ORIGINS=https://www.chargeapp.com`.
6. In Vercel, **Deployments**, open the latest one and choose **Redeploy** so the new values apply.

## 5. Optional: Google sign-in

In Google Cloud Console create an OAuth client (Web application) and add this redirect address:
`https://YOUR-DOMAIN/api/auth/callback/google`
Then add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the Vercel environment variables and redeploy.

## What changes once it is online

- The phone app install, the offline page and the wake lock all need HTTPS. A real domain gives you that, so these work properly there.
- Everyone who signs up shares the same database, so the Community rooms start to be real.
- Back up the Turso database now and then (their dashboard has options for it).
- Updating later: change the code, run `git add . && git commit -m "update" && git push`. Vercel redeploys on its own.

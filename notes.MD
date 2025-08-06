MANAGE RETURNS IF THERE ARE RETURNS
REMOVE OUR PERCENT AND SHOULD WE LET PLUG WAIT FOR 3 DAYS
//try saving contact support mail in db also first, for us to reference and send in background














format mail
minio priviledges





SO A SUPPLIER CAN ACCEPT AN ORDER I.E REQUEST A DELIVERY FOR SUCH ORDER ITEMS, WE CAN ALSO REQUEST DELIVERY ON BEHALF OF SUPPLIERS, SUPPLIERS CAN CANCEL ORDERS, WHEN CANCELLED ORDER, OPEN MODAL FOR ARE YOU SURE OR SO, CAN ONLY CANCEL,ACCEPT OR DELAY AN ORDER THAT IS PENDING, cancelled and accept only if pending, do we programmatically send emails, what of moving stuff to cancelled state, we may try getting orderitems like makeups that we can get, not unique products


admin functions will be based on scenarios, like accepting orders, cancelling orders, shipping orders,  delivered orders, they are based on each others or so, because we may get order items from other people not our suppliers, probably buying them, and if it is bought, we dont include that as part of supplier payment ----> IMPORTANT CREATE IT THEN, TO REMOVE THE ORDER FROM THE SUPPLIER BOUGHT ITEM BUT PAY THE PLUG

REDUCE THE ORDER ITEMS, WHEN ONLY SOME ORDERITEMS ARE ACCEPTED, IF SOME ORDER ITEMS ARE RETURNED WHAT DO WE DO,IF ORDER ITEMS ARE COMPLETELY CANCELLED, WE REMOVE THE ORDERITEMS OR SO  FOR THAT SUPPLIER


<!-- THE SOLD PRODUCT ITEM INCREASED  WHEN DELIVERED SO MAPPING THROUGH
THE SOLD PRODUCT ITEM REDUCED  WHEN RETURNED SO MAPPING THROUGH -->
BASED ON SCENARIOS IF ORDER WAS PLACED AND PROBABLY THE SUPPLIER DOES NOT HAVE AGAIN BUT STILL LEFT THE STOCK UNMANAGED IF WE ARE GOING TO GET THE PRODUCT FROM OTHERS WE REDUCE THEIR MONEY AND ORDERITEMS OR SO, REMOVING THEM OR SO ----> SO LOOK AT THIS, WE WOULD CREATE A SCRIPT FOR THIS

<!-- REDUCE SALES ON RETURN AND CANCEL ORDER -->
































 setting up a backup strategy for your production PostgreSQL database

 # Basic full dump
pg_dump -U your_user -h your_host -d your_dbname -F c -f backup.dump

# Plain SQL version
pg_dump -U your_user -h your_host -d your_dbname -F p -f backup.sql


🧪 Development Environment
In development, your goal is to define, test, and version your schema changes safely and iteratively.

Command	Purpose
npx prisma init	Initializes Prisma in your project (schema.prisma, .env, etc.)
npx prisma generate	Regenerates the Prisma Client (after changes to schema.prisma)
npx prisma migrate dev --name <name>	Creates a migration and applies it to your dev DB (preferred for dev work)
npx prisma db push	Pushes schema changes directly to the DB (use only for quick testing, not with migrations)
npx prisma studio	Opens Prisma Studio – a GUI for browsing/editing your database
npx prisma migrate reset	Resets your DB and re-applies all migrations (dev only; destroys data)
npx prisma db seed	Runs your seed script (for test or initial data)
npx prisma format	Formats the schema.prisma file neatly
npx prisma migrate status	Shows migration state vs actual DB (helps debug drift issues)

🚀 Production Environment
In production, the goal is safe, traceable migrations without data loss or resets.

Command	Purpose
npx prisma migrate deploy	Applies all pending migration files to the production DB safely
npx prisma generate	Regenerates the Prisma Client (usually done during CI/CD build step)
npx prisma migrate status	Checks if production DB is up-to-date with migration history
npx prisma db seed	Seeds initial data if needed (run manually or during deploy)


Invalidate all sessions
Direct to a special password reset page

the backend can invalidate tokens if the user data changes significantly (like password change), requiring re-authentication.

: When a user logs out or resets their password, delete their refresh token from the DB.


WEBSITE CRUD OPERATION TWO UPGRADES OUR UPGRADES AND USER UPDATES
CHECK PHONE NOTES, HOW DO WE WORK WITH ESCROW
promotion -> discount and flash sales supplier

if a user updates or changes his password should he be required to login again, if i keep them logged in and Optionally notify the user by email: "Your password was changed. If this wasn’t you, click here to secure your account." is this okay, if they click the email, what will the click here to secure your account do, what do we do for them

how to remove a specific image in products after upload -> edit -> things to check-> handle short videos -> there should be checkss to prevent offsite sale
PIXELS FOR TRACKING
LOADING, EMPTY STATE
remove try again on auth cerror callbackor or contact us there
THREE DAYS PENDING TIME WHEN IT GETS UPDATED

order do we update supplier inventory, when do we update, what if they returned do we still go and update again

image compressing
image resizing tip
mime type
dimensions one genneral unit or so

pwa 

IN UPLOADING PRODUCT GIVE TIP TO GIVE ENOUGH INFO
WE NEED TO MAKE THE WEBSITE DYNAMIC ON REQUEST, BECAUSE OF UPDATE
NO IF A PLUG ADD OR UPDATE THEIR PRODUCTS IT REBUILDS
\|" 
https://youtu.be/6rDBjdBjYCg?si=ryPo5B-Gx7UHSj3d

SHARE LINK ON SOCIAL MEDIA TIP


accepting cookies

We use cookies to deliver and improve our services, analyze site usage, and if you agree, to customize or personalize your experience and market our services to you. You can read our Cookie Policy here.


adjust filters in marketplace

algorithm for marketplace, recommended products, similar products 




WHAT VARIATION DOES THE PUG 
THE BUYER CHOOSES A VARIATION TO BUY IN CHECKOUT



IF USER WANTS TO PICK TO PICK UP WE USE OUR LOCATION OR OUR PARTNER FOR PICKUPS

ALSO VERIFICATION
OTHER STUFF
PROBABLY ANALYTICS
TOTAL SALES OF PRODUCT IN DESCRIPTION
LOCATION LIBRARY
LOCATION OF PRODUCT
PICKUP LOCATIONS
SOCIAL MEDIA LINK, INCLUDE REFFERRER and encode

dimension ui
ADJUST THE WAY PICKUP LOCATION IS STORED TO GET STATE 
INDEX DB
NOT SENDING DIMENSIONS


































DO CUSTOMER SUPPORT FOR PLUGS
Buyers choose a "Delivery Day" (e.g., "Want it faster? Pay ₦500 extra. Want it cheaper? Wait 3 days.").
Public leaderboards show the fastest Plugs/suppliers.
How It Works:
Buyers earn "Pluggn Points" for reviews, referrals, and social shares.

Points unlock perks: free delivery, exclusive drops, or cashback.

High-point users get early access to flash sales.

After purchase, buyers get a unique "Unbox & Earn" link.

If they post a video unboxing the product on social media (tagging Pluggn and the Plug), they earn 10% cashback on their next purchase.

The Plug earns 5% commission on sales generated from the buyer’s post.


Buyers become salespeople → Viral loop.

Authentic UGC (user-generated content) builds trust better than ads.

 Buyers track orders via Pluggn’s app (not third-party couriers), even if items come from multiple suppliers. not authenticated just put tracking id and you can see it


 A 24/7 support team handles returns, refunds, and disputes—not the individual Plugs.

 Every Plug/supplier is rated publicly (e.g., 4.8/5 stars) based on delivery speed, product quality, and reviews.


 Top Plugs become "Pluggn Ambassadors," earning commissions for recruiting new sellers (MLM-style, but compliant).

Example: Amina recruits 50 Plugs in Lagos, earning 2% of their sales.


"Get it in 48hrs or get 20% off next order"—only possible with owned logistics.

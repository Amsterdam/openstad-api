const {v4: uuidv4} = require('uuid');
const db = require('../db')

const getDaysArray = (start, end) => {
  for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    arr.push(new Date(dt));
  }
  return arr;
}



const createOrUpdate = async ({
                        user,
                        provider,
                        subscriptionActive,
                        subscriptionProductId,
                        planId,
                        siteId,
                        paystackPlanCode,
                        paystackSubscriptionCode,
                        mollieFirstPaymentId,
                        mollieSubscriptionId,
                        mollieCustomerId,
                        productId,
                        receipt,
                        transactionId,
                        latestReceipt,
                        validationResponse,
                        startDate,
                        endDate,
                        isCancelled,
                        paystackClient,
                        mollieClient
                      }) => {

  try {
    const subscriptionData = {
      subscriptionProductId: subscriptionProductId,
      subscriptionPaymentProvider: provider,
      active: subscriptionActive,
      siteId: siteId,
      uuid: uuidv4(),
      transactionId,
      startDate,
      endDate,
      planId
    };

    console.log('userSubscriptionData provider', provider);
    console.log('userSubscriptionData active', subscriptionData.active);


    switch (provider) {
      case "paystack":
        // code block
        subscriptionData.paystackPlanCode = paystackPlanCode;
        subscriptionData.paystackSubscriptionCode = paystackSubscriptionCode;
        break;
      case "mollie":
        subscriptionData.mollieSubscriptionId = mollieSubscriptionId;
        subscriptionData.mollieCustomerId = mollieCustomerId;
        subscriptionData.mollieFirstPaymentId = mollieFirstPaymentId;
        break;
      case "google":
        // code block
        //subscriptionData.paystackPlanCode = req.order.extraData.paystackPlanCode;

        subscriptionData.receipt = receipt;
        subscriptionData.productId = productId;

        break;
      case "apple":
        subscriptionData.receipt = receipt;
        subscriptionData.productId = productId;
        break

      case "stripe":

        break

      default:
        // code block
    }

    const userSubscriptionData = user.subscriptionData ? user.subscriptionData : {};

    console.log('userSubscriptionData ends');

    let userSubscriptions = userSubscriptionData && userSubscriptionData.subscriptions && Array.isArray(userSubscriptionData.subscriptions) ?
        userSubscriptionData.subscriptions : [];

    //console.log('userSubscriptionData userSubscriptions', userSubscriptionData);

    /**
     * Sometimes update is called double.
     * So find if we already processed this update
     * in case it exists, and is active, we do nothing
     */
    const subscriptionAlreadyExists = userSubscriptions.find((userSubscription) => {
      let isFound = false;

      switch (userSubscription.subscriptionPaymentProvider) {
        case "paystack":
          // code block
          isFound = userSubscription.paystackSubscriptionCode === paystackSubscriptionCode;
          break;
        case "mollie":
          isFound = userSubscription.mollieSubscriptionId === mollieSubscriptionId;
          break;
        case "google":
          isFound = userSubscription.productId === productId;
          break;
        case "apple":
          isFound = userSubscription.productId === productId;
          break
        case "stripe":
          break
        default:
      }

      return isFound;
    });


    console.log('subscriptionAlreadyExists subscriptionAlreadyExists', subscriptionAlreadyExists);
    console.log('subscriptionAlreadyExists subscriptionData', subscriptionData);


    if (subscriptionAlreadyExists && subscriptionAlreadyExists.active === subscriptionData.active) {
      console.log('Subscription trying to update already exists for user with same status new subscriptionData ', subscriptionData, ' for user subscription', userSubscriptionData)
      return
    } else if (subscriptionAlreadyExists && subscriptionAlreadyExists.active !== subscriptionData.active) {
      console.log('Subscription already exists but not active anymore so set to inactive', userSubscriptionData);
      // set subscriptionAlreadyExists active to false
      console.log('SsubscriptionAlreadyExists', subscriptionAlreadyExists.uuid);

      userSubscriptions = userSubscriptions.map((subscription) => {
        console.log('SsubscriptionAlreadyExists', subscription.uuid);

        if (subscriptionAlreadyExists.uuid === subscription.uuid) {
          subscription.active = subscriptionData.active;
        }

        return subscription;
      });


      if (!subscriptionData.active) {
        try {
          await db.Event.create({
            status: 'activity',
            siteId: siteId,
            message: 'App Subscription cancelled',
            userId: user.id,
            resourceType: 'subscription',
            name: 'subscriptionCancelled' + provider,
          });
        } catch (e) {
          console.log('Error in creating event sub update', e)
        }
      }


    } else if (!subscriptionAlreadyExists) {
      console.log('Subscription doesnt exists, so create a new one, and cancel the old ones ', userSubscriptionData);

      const activeSubscriptions = userSubscriptionData.subscriptions && Array.isArray(userSubscriptionData.subscriptions) ? userSubscriptionData.subscriptions.filter((subscription) => {
        return subscription.active;
      }) : [];

      // this is old, probably not used, see user model .access logic
      userSubscriptionData.isActiveSubscriber = activeSubscriptions.length > 0 ? 'yes' : 'no';

      // if user already has subscriptions but updates to a new one, we cancel this one, and refund the days left in case it's a web sign up.
      // Apple automatically / Google also I think :)

      if (activeSubscriptions.length > 0) {
        for (const activeSubscription of activeSubscriptions) {
          try {
            await cancel({
              activeSubscription, refundLeftOverDays: true, paystackClient, mollieClient
            });
          } catch (e) {
            console.log('Error in cancellation of existing subscription: ', e);
            throw Error(e);
            return;
          }
        }
      }
      // set all active to false
      userSubscriptions = userSubscriptions.map((subscription) => {
        subscription.active = false;
        return subscription;
      });

      /**
       * In case it's a new subscription, and there is an active one, we cancel the old one
       *
       * Can be either a down or upgrade.
       */
      userSubscriptions.push(subscriptionData);

        try {
          await db.Event.create({
            status: 'activity',
            siteId: siteId,
            message: 'New subscription created',
            userId: user.id,
            resourceType: 'subscription',
            name: 'subscriptionCreated' + provider,
            extraData: subscriptionData
          });
        } catch (e) {
          console.log('Error in creating event sub create', e)
        }

      // cancel
    } else {
      console.log('We do nothing in subscription create or update....')
    }
    
    userSubscriptionData.subscriptions = userSubscriptions;

    await user.update({subscriptionData: userSubscriptionData});

    return user;
  } catch (e) {
    console.log('Error in updating subscription: ', e);
    throw Error(e);
  }
}

const percentageLeftOnPayment = (interval, nextPaymentDate) => {
  const intervalDays = {
    'weekly': 7,
    '1 week': 7,
    '1 weeks': 7,
    '1 month': 30,
    '1 months': 30,
    'monthly': 30,
    '3 months': 92,
    'quarterly': 92,
    'yearly': 365,
    'annually': 365,
    '1 year': 365,
    '1 years': 365,
  }

  const totalDaysInInterval = intervalDays[interval.trim()];

  const daysTillNexPaymentDate = getDaysArray(new Date(), new Date(nextPaymentDate));
  const daysCount = daysTillNexPaymentDate.length;

  return (daysCount / totalDaysInInterval);
}

const cancel = async ({
                        subscription, refundLeftOverDays, paystackClient, mollieClient
                      }) => {
  try {
    const {mollieCustomerId, mollieSubscriptionId, paystackSubscriptionCode} = subscription;

    switch (subscription.subscriptionPaymentProvider) {
      case "paystack":
        console.log('Start cancel Paystack Fetched paystackClient ', paystackClients)


        let subscriptionResponse = await paystackClient.getSubscription(paystackSubscriptionCode);
        subscriptionResponse = typeof subscriptionResponse === 'string' ? JSON.parse(subscriptionResponse) : subscriptionResponse;
        subscriptionResponse = subscriptionResponse.body;

        const subscriptionData = subscriptionResponse.data ? subscriptionResponse.data : {};
        const subscriptionPlan = subscriptionData.plan ? subscriptionData.plan : {};
        const paystackInterval = subscriptionPlan.interval;
        const paystackAmount = subscriptionPlan.amount;

        const paystackNextPaymentDate = subscriptionData.next_payment_date;
        const paystackEmailToken = subscriptionData.email_token;
        const paystackCustomerCode = subscriptionData.customer && subscriptionData.customer.customer_code ? subscriptionData.customer.customer_code : false;

        console.log('Paystack Fetched subscriptionData', subscriptionData)
        console.log('Paystack paystackInterval', paystackInterval)
        console.log('Paystack paystackNextPaymentDate', paystackNextPaymentDate)
        console.log('Paystack paystackAmount', paystackAmount)

        await paystackClient.disableSubscription(paystackSubscriptionCode, paystackEmailToken);

        // dont refund if not active
        if (subscriptionData.status !== 'active') {
          return;
        }

        if (refundLeftOverDays & paystackCustomerCode) {
          console.log('Paystack refundLeftOverDays', refundLeftOverDays)

          const percentage = percentageLeftOnPayment(paystackInterval, paystackNextPaymentDate);

          console.log('Paystack percentage', percentage);

          let paystackTransactionResponse = await paystackClient.listTransaction(50, 1, paystackCustomerCode, 'success');
          paystackTransactionResponse = typeof paystackTransactionResponse === 'string' ? JSON.parse(paystackTransactionResponse) : paystackTransactionResponse;
          paystackTransactionResponse = paystackTransactionResponse.body;

          const paystackTransactions = paystackTransactionResponse.data ? paystackTransactionResponse.data : [];

          //fetch latest, with amount high enough
          const amountLeft = percentage * paystackAmount;

          console.log('Paystack amountLeft', amountLeft);

          const paystackTransactionToRefund = paystackTransactions.find((transaction) => {
            return transaction.amount >= amountLeft;
          });

          console.log('Paystack amountLeft', amountLeft);

          if (!paystackTransactionToRefund) {
            throw new Error('Didnt find transaction to refund for paystack subscription: ', subscription);
            return;
          }

          const paystackTransactionId = paystackTransactionToRefund.id;

          console.log('Paystack paystackTransactionToRefund', paystackTransactionToRefund);

          //await paystackClient.createRefund(paystackTransactionId, amountLeft);
        }

        break;
      case "mollie":
        console.log('Start cancel Mollie Fetched mollieClient ', mollieClient)

        const mollieSubscription = await mollieClient.customers_subscriptions.get(mollieSubscriptionId, {customerId: mollieCustomerId});

        console.log('Mollliee mollieSubscription', mollieSubscription);

        const deleteResponse = await mollieClient.customerSubscriptions.delete(mollieSubscriptionId, {
          customerId: mollieCustomerId,
        });

        // dont refund if not active
        if (subscription.status !== 'active') {
          return;
        }

        if (refundLeftOverDays && mollieSubscription.interval && mollieSubscription.nextPaymentDate) {
          const percentage = percentageLeftOnPayment(mollieSubscription.interval, mollieSubscription.nextPaymentDate);
          const amountLeft = percentage * parseFloat(mollieSubscription.amount.value);

          console.log('Mollliee percentage', percentage);
          console.log('Mollliee amountLeft', amountLeft);

          // safeguard bad calculation
          if (amountLeft > amount) {
            throw Error('Trying to refund more then subscription amount')
            return;
          }

          if (!subscription.mollieFirstPaymentId) {
            throw Error('Cannot find mollieFirstPaymentId to refund the subscription amount: ', subscription)
            return;
          }

          const refundOptions = {
            paymentId: subscription.mollieFirstPaymentId,
            amount: {
              amount: amountLeft,
              currency: mollieSubscription.amount.currency
            }
          }

          console.log('Mollliee refundOptions', refundOptions);

          //const paymentRefund = await mollieClient.paymentRefunds.create(refundOptions);
        }

        break;
      case "google":
        // apple / google cancel their own google account, for swithc, goes automatic
        break;
      case "apple":
        // apple / google cancel their own apple account, for swithc, goes automatic
        break
      case "stripe":
        break
      default:
    }
  } catch (e) {
    console.warn('Error in cancelling subscription', e)
  }
}

const getActiveSubscriptionEntries = (userSubscriptionData) => {
  return userSubscriptionData.filter(sub => sub.active)
}

exports.createOrUpdate = createOrUpdate;
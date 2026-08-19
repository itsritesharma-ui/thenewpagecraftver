import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  try {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      hash
    } = req.body

    const salt = process.env.PAYU_SALT

    if (!salt) {
      return res.status(500).send('PayU Salt is missing')
    }

    const reverseHashString =
      `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`

    const calculatedHash = crypto
      .createHash('sha512')
      .update(reverseHashString)
      .digest('hex')

    if (calculatedHash !== hash) {
      return res.status(400).send('Invalid payment response')
    }

    if (status !== 'success') {
      return res.redirect(303, '/payment-failed')
    }

    return res.redirect(
      303,
      `/payment-success?txnid=${encodeURIComponent(txnid)}`
    )
  } catch (error) {
    console.error('PayU success callback error:', error)
    return res.status(500).send('Payment verification failed')
  }
}
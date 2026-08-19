import crypto from 'crypto'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    })
  }

  try {
    const {
      amount,
      productinfo,
      firstname,
      email,
      phone
    } = req.body

    const key = process.env.PAYU_KEY
    const salt = process.env.PAYU_SALT

    if (!key || !salt) {
      return res.status(500).json({
        error: 'PayU credentials are not configured'
      })
    }

    if (!amount || !productinfo || !firstname || !email || !phone) {
      return res.status(400).json({
        error: 'Required payment details are missing'
      })
    }

    const txnid = `TPC${Date.now()}`

    const udf1 = ''
    const udf2 = ''
    const udf3 = ''
    const udf4 = ''
    const udf5 = ''

    const hashString =
      `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`

    const hash = crypto
      .createHash('sha512')
      .update(hashString)
      .digest('hex')

    const origin =
      req.headers.origin ||
      `https://${req.headers.host}`

    return res.status(200).json({
      action: 'https://test.payu.in/_payment',
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      surl: `${origin}/api/payu-success`,
      furl: `${origin}/api/payu-failure`,
      hash
    })

  } catch (error) {
    console.error('PayU create payment error:', error)

    return res.status(500).json({
      error: 'Unable to start payment'
    })
  }
}
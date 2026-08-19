export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  try {
    const { txnid = '' } = req.body

    return res.redirect(
      303,
      `/payment-failed?txnid=${encodeURIComponent(txnid)}`
    )
  } catch (error) {
    console.error('PayU failure callback error:', error)

    return res.redirect(303, '/payment-failed')
  }
}
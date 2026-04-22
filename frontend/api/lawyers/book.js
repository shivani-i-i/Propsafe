module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }

  try {
    const { lawyerId, userDetails } = req.body || {};

    if (!lawyerId || !userDetails?.name || !userDetails?.phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'lawyerId and userDetails (name, phone) are required'
        }
      });
    }

    const booking = {
      _id: `vz-${Date.now()}`,
      lawyerId: Number(lawyerId),
      userDetails: {
        name: String(userDetails.name || '').trim(),
        phone: String(userDetails.phone || '').trim(),
        email: String(userDetails.email || '').trim()
      },
      bookingTime: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      data: {
        message: 'Lawyer booking created successfully',
        persisted: false,
        booking
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create lawyer booking',
        details: error.message
      }
    });
  }
};

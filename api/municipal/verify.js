module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed'
      }
    });
  }

  const registrationNumber = req.body && req.body.registrationNumber;
  if (!registrationNumber) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'registrationNumber is required'
      }
    });
  }

  const normalized = String(registrationNumber).trim().toUpperCase();
  const checksum = normalized
    .split('')
    .reduce(function(sum, char) {
      return sum + char.charCodeAt(0);
    }, 0);

  const reraStatus = checksum % 3 === 0 ? 'VALID' : checksum % 3 === 1 ? 'PENDING_RENEWAL' : 'NOT_FOUND';
  const taxRecordStatus = checksum % 2 === 0 ? 'UP_TO_DATE' : 'ARREARS_PENDING';
  const buildingPermitStatus = checksum % 5 === 0 ? 'EXPIRED' : 'APPROVED';
  const zoningCompliance = checksum % 7 === 0 ? 'NON_COMPLIANT' : 'COMPLIANT';

  return res.status(200).json({
    success: true,
    data: {
      registrationNumber: normalized,
      reraStatus: reraStatus,
      taxRecordStatus: taxRecordStatus,
      buildingPermitStatus: buildingPermitStatus,
      zoningCompliance: zoningCompliance
    }
  });
};

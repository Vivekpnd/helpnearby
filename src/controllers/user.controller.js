const User = require("../models/User");

async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: req.user }
  });
}

async function updateProfile(req, res, next) {
  try {
    const updates = {};

    if (typeof req.body.name === "string") {
      updates.name = req.body.name.trim().slice(0, 60);
    }

    if (typeof req.body.profilePhoto === "string") {
      updates.profilePhoto = req.body.profilePhoto.trim();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
}

async function updateLocation(req, res, next) {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude."
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [longitude, latitude]
          }
        }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Location updated.",
      data: { location: user.location }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMe,
  updateProfile,
  updateLocation
};

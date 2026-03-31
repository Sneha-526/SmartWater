const mongoose = require('mongoose');

const jarSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      enum: ['1L', '2L', '10L', '20L'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerUnit: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
    },
    deliveryLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    jars: {
      type: [jarSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one jar must be ordered',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['cod', 'online'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'on_the_way', 'delivered', 'rejected'],
      default: 'pending',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Add initial status to history
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory = [{ status: 'pending', timestamp: new Date() }];
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);

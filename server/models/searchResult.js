const searchResult = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true,
  },
  data: {
    type: String,
    required: true,
    minlength: 1,
  },
});

module.exports = mongoose.model('searchResult', searchResult);
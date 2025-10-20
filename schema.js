const Joi = require('joi');

const eventSchema = Joi.object({
    event: Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        date: Joi.date().required(),
        registrationFee: Joi.number().required().min(0),
        venue: Joi.string().required(),
        category: Joi.string().valid("Technical", "Cultural", "Sports").required(),
        poster: Joi.string().uri().optional().allow('', null),
    }),
});

module.exports = eventSchema;
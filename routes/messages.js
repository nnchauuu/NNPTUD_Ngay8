let express = require('express')
let router = express.Router()
let mongoose = require('mongoose')
let messageModel = require('../schemas/messages')
let userModel = require('../schemas/users')
let { CheckLogin } = require('../utils/authHandler')

router.get('/:userID', CheckLogin, async function (req, res, next) {
    let currentUserId = req.user._id
    let userID = req.params.userID

    if (!mongoose.Types.ObjectId.isValid(userID)) {
        res.status(400).send({ message: 'userID khong hop le' })
        return
    }

    let messages = await messageModel
        .find({
            $or: [
                { from: currentUserId, to: userID },
                { from: userID, to: currentUserId }
            ]
        })
        .sort({ createdAt: 1 })

    res.send(messages)
})

router.post('/:userID', CheckLogin, async function (req, res, next) {
    let currentUserId = req.user._id
    let userID = req.params.userID

    if (!mongoose.Types.ObjectId.isValid(userID)) {
        res.status(400).send({ message: 'userID khong hop le' })
        return
    }

    let receiver = await userModel.findById(userID)
    if (!receiver) {
        res.status(404).send({ message: 'user nhan khong ton tai' })
        return
    }

    let type = req.body.type
    let text = req.body.text

    if (req.body.file) {
        type = 'file'
        text = req.body.file
    }

    if (!type) {
        type = 'text'
    }

    if (!['file', 'text'].includes(type)) {
        res.status(400).send({ message: 'type phai la file hoac text' })
        return
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).send({ message: 'text khong duoc de trong' })
        return
    }

    let message = new messageModel({
        from: currentUserId,
        to: userID,
        messageContent: {
            type: type,
            text: text.trim()
        }
    })

    message = await message.save()
    res.send(message)
})

router.get('/', CheckLogin, async function (req, res, next) {
    let currentUserId = req.user._id

    let messages = await messageModel
        .find({
            $or: [{ from: currentUserId }, { to: currentUserId }]
        })
        .sort({ createdAt: -1 })

    let latestMessageMap = new Map()

    for (let message of messages) {
        let partnerId = message.from.toString() === currentUserId.toString()
            ? message.to.toString()
            : message.from.toString()

        if (!latestMessageMap.has(partnerId)) {
            latestMessageMap.set(partnerId, message)
        }
    }

    res.send(Array.from(latestMessageMap.values()))
})

module.exports = router

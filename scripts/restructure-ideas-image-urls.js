const db = require('../src/db');

async function updateImageUrls() {

    let ideas = []

    try {
        ideas = await db.Idea.findAll();
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }

    console.log(`Image URL update process started for ${ideas.length} ideas (${process.env.IMAGE_URL_OLD_BASE_PATH} ==> ${process.env.IMAGE_URL_NEW_BASE_PATH})`)

    for (let idea of ideas) {
        
        if (idea.extraData.images.length === 0) {
            continue
        }

        let updatedImageUrls = idea.extraData.images
            .map(url => url.replace(process.env.IMAGE_URL_OLD_BASE_PATH, process.env.IMAGE_URL_NEW_BASE_PATH))

        if (updatedImageUrls === idea.extraData.images) {
            continue
        }

        idea.extraData.images = updatedImageUrls

        idea.setDataValue('extraData', idea.extraData)
        idea.changed('extraData', true);

        try {
            await idea.save({ hooks: false, validate: false }); // Bypass hooks and validation that otherwise will prevent the idea from saving
            console.log(`Updated images for idea ID: ${idea.id}. The new image-URL's are: ${idea.extraData.images}`);
        } catch (error) {
            console.error(`Unable to save new image-URLs to the database for idea ${idea.id}: ${error}`)
        }
    }

    console.log('Image URL update process completed.')

}

updateImageUrls();
const db = require('../src/db');

async function updateImageUrls() {

    try {

        const ideas = await db.Idea.findAll();

        console.log(`Going through all ideas to look for image-arrays including the URLs with the base ${process.env.IMAGE_URL_OLD_BASE_PATH}, to replace them with the URL base ${process.env.IMAGE_URL_NEW_BASE_PATH}`)

        for (let idea of ideas) {
            let updatedImageUrls = idea.extraData.images
                .map(url => url.replace(process.env.IMAGE_URL_OLD_BASE_PATH, process.env.IMAGE_URL_NEW_BASE_PATH))
            
            if (updatedImageUrls.length === 0) {
                continue
            }

            idea.extraData.images = updatedImageUrls

            idea.setDataValue('extraData', idea.extraData)
            idea.changed('extraData', true);

            await idea.save({ hooks: false, validate: false }); // Bypass hooks and validation that otherwise will prevent the idea from saving
            console.log(`Updated images for idea ID: ${idea.id}. The new image-URL's are: ${idea.extraData.images}`);
        }

        console.log('Image URL update process completed.')

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        console.log(`Closing the db conection...`)
        await db.sequelize.close()
    }
}

updateImageUrls();
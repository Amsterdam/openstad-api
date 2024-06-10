const { Op } = require('sequelize');

const db = require('../src/db');

// Function to update image URLs
async function updateImageUrls() {
    console.log(`Starting proces to update image URLs`)
    try {
        // Find all ideas where the extraData column is not null

        console.log(`Going to look for ideas with extraData`)
        const ideas = await db.Idea.findAll({
            where: {
                extraData: {
                [Op.ne]: null
                }
            }
        });

        console.log(`Found ${ideas.length} ideas with extraData`)

        console.log(`Going through all ideas to look for image-arrays including the URLs with the base ${process.env.IMAGE_URL_OLD_BASE_PATH}, to replace them with the URL base ${process.env.IMAGE_URL_NEW_BASE_PATH}`)

        for (let idea of ideas) {
            // Find all the ideas where extraData.images contains an array
            if (idea.extraData && idea.extraData.images && Array.isArray(idea.extraData.images)) {
                let updated = false;
                // Go through all the images in the array
                idea.extraData.images = idea.extraData.images.map(url => {
                    if (url.startsWith(process.env.IMAGE_URL_OLD_BASE_PATH)) {
                        updated = true;
                        const imageId = url.split('/').pop();
                        return `${process.env.IMAGE_URL_NEW_BASE_PATH}/image/${imageId}`;
                    }
                    return url;
                });

                if (updated) {
                    // Mark extraData as changed
                    idea.setDataValue('extraData', idea.extraData);
                    idea.changed('extraData', true);
                    
                    await idea.save({ hooks: false, validate: false }); // Bypass hooks and validation preventing the idea from saving
                    console.log(`Updated images for idea ID: ${idea.id}. The new image-URL's are: ${idea.extraData.images}`);
                }
            }
        }

        console.log('Image URL update process completed.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        console.log(`Closing the db conection...`)
        await db.sequelize.close()
    }
}

// Execute the function
updateImageUrls();
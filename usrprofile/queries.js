// Queries FOR USER PROFILE
const checkProfile = "SELECT * FROM  hub_profile where email = ? " ;

const updateProfile = `UPDATE hub_profile SET firstname = ? , lastname = ? , 
mobile = ?, gender = ?, date_of_birth = ?, skillset = ?, height = ?, 
bodytype = ?, complexion = ?, state = ?, city = ?, state_of_origin = ?,
privacy = ?, hasRegistered = 1, status = 1 WHERE  email = ? ` ;

const updateProfileStatus = "UPDATE thub_users SET profileupdate = 1  WHERE  email = ? " ;

const uploadActivity = "INSERT INTO tbl_activity ( usocialid, comments, filepath, filetype, isphoto) VALUES (?, ?, ?, ?, ?) ";

const getInfoActivity = "SELECT id, usocialid as email, comments as content, filetype as imagetype, filepath as imagename, isphoto, datecreated FROM tbl_activity WHERE usocialid = ? ORDER BY datecreated DESC ";


module.exports = {
    checkProfile,
    updateProfile,
    updateProfileStatus,
    uploadActivity,
    getInfoActivity
}